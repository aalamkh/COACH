import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  notes,
  progress,
  retros,
  statusLines,
  submissions,
  tasks,
  type PaceLabel,
} from "@/db/schema";
import { MissingApiKeyError } from "./anthropic";
import { MODEL_IDS, readSettings } from "./env";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

// ───────── date helpers ─────────

export function todayLocalDate(): string {
  const d = new Date();
  return formatLocalDate(d);
}
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local Monday 00:00. Used to filter "this week" artifacts. */
export function startOfWeekLocal(): Date {
  const now = new Date();
  const day = now.getDay(); // Sun=0..Sat=6
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ───────── pace context ─────────

export interface PaceContext {
  todayDate: string;
  totalPlanTasks: number;
  passedCount: number;
  expectedByToday: number; // ≈ 1 task/day from start (week ≥ 1 only)
  daysSinceLastPass: number | null;
  snoozedCount: number;
  inProgress: Array<{
    id: number;
    week: number;
    day: number;
    title: string;
    daysInProgress: number | null;
  }>;
  recentlyPassed: Array<{
    id: number;
    week: number;
    day: number;
    title: string;
    passedAt: string;
  }>;
  overdueRetroWeeks: number[];
  currentPointer: { week: number; day: number } | null;
}

export function gatherPaceContext(): PaceContext {
  const todayDate = todayLocalDate();

  // Plan progress (week ≥ 1 only — AI track excluded).
  const planRows = db
    .select({
      week: tasks.week,
      day: tasks.day,
      status: progress.status,
      startedAt: progress.startedAt,
      passedAt: progress.passedAt,
      snoozedUntil: progress.snoozedUntil,
      title: tasks.title,
      id: tasks.id,
    })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(gt(tasks.week, 0))
    .all();

  const totalPlanTasks = planRows.length;
  const passedCount = planRows.filter((r) => r.status === "passed").length;
  const now = Date.now();

  const snoozedCount = planRows.filter(
    (r) => r.snoozedUntil != null && r.snoozedUntil.getTime() > now,
  ).length;

  // Earliest startedAt as the "start" of the program.
  const startedTimes = planRows
    .map((r) => r.startedAt?.getTime())
    .filter((t): t is number => typeof t === "number");
  const startMs = startedTimes.length > 0 ? Math.min(...startedTimes) : null;
  const daysIn = startMs ? Math.floor((now - startMs) / DAY_MS) : 0;
  // Day-1 expectation is 1 task; never below 0.
  const expectedByToday = startMs ? Math.max(1, daysIn + 1) : 0;

  const lastPassMs = Math.max(
    0,
    ...planRows
      .map((r) => r.passedAt?.getTime() ?? 0)
      .filter((t): t is number => typeof t === "number"),
  );
  const daysSinceLastPass = lastPassMs > 0 ? Math.floor((now - lastPassMs) / DAY_MS) : null;

  const inProgress = planRows
    .filter((r) => r.status === "in_progress")
    .map((r) => ({
      id: r.id,
      week: r.week,
      day: r.day,
      title: r.title,
      daysInProgress: r.startedAt
        ? Math.floor((now - r.startedAt.getTime()) / DAY_MS)
        : null,
    }))
    .sort((a, b) => (b.daysInProgress ?? 0) - (a.daysInProgress ?? 0));

  const recentlyPassed = planRows
    .filter((r) => r.status === "passed" && r.passedAt)
    .sort((a, b) => (b.passedAt!.getTime() - a.passedAt!.getTime()))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      week: r.week,
      day: r.day,
      title: r.title,
      passedAt: r.passedAt!.toISOString(),
    }));

  // Overdue retros: weeks whose last day is passed ≥ 3d ago and have no retro row.
  const lastDayByWeek = new Map<number, { day: number; passedAt: Date | null }>();
  for (const r of planRows) {
    const cur = lastDayByWeek.get(r.week);
    if (!cur || r.day > cur.day) {
      lastDayByWeek.set(r.week, {
        day: r.day,
        passedAt: r.status === "passed" ? r.passedAt : null,
      });
    }
  }
  const retroWeeks = new Set(
    db.select({ week: retros.week }).from(retros).all().map((r) => r.week),
  );
  const overdueRetroWeeks: number[] = [];
  for (const [week, info] of lastDayByWeek) {
    if (!info.passedAt) continue;
    if (retroWeeks.has(week)) continue;
    if (now - info.passedAt.getTime() < 3 * DAY_MS) continue;
    overdueRetroWeeks.push(week);
  }
  overdueRetroWeeks.sort((a, b) => a - b);

  // Current pointer (lowest non-passed)
  const open = planRows.filter((r) => r.status !== "passed");
  open.sort((a, b) => a.week - b.week || a.day - b.day);
  const cp = open[0];
  const currentPointer = cp ? { week: cp.week, day: cp.day } : null;

  return {
    todayDate,
    totalPlanTasks,
    passedCount,
    expectedByToday,
    daysSinceLastPass,
    snoozedCount,
    inProgress,
    recentlyPassed,
    overdueRetroWeeks,
    currentPointer,
  };
}

// ───────── theme extractor (Haiku, cached on retros row) ─────────

const themesJsonSchema = z.object({
  themes: z.array(z.string().min(1).max(120)).max(8),
});

const THEME_TOOL = {
  name: "submit_themes",
  description: "Return up to 5 short, comma-list-friendly unresolved themes.",
  input_schema: {
    type: "object" as const,
    properties: {
      themes: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 8 },
    },
    required: ["themes"],
  },
};

const THEMES_SYSTEM = `From the retro assessment below, extract up to 5 short, distinct phrases (3-8 words each) describing UNRESOLVED concerns the developer should still address. No advice, no actions, just the open threads. Skip anything already resolved. Phrases only — no full sentences.`;

async function extractThemesForRetro(
  apiKey: string,
  retroId: number,
  assessmentMd: string,
): Promise<string[]> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL_IDS.haiku,
    max_tokens: 300,
    temperature: 0.2,
    system: [{ type: "text", text: THEMES_SYSTEM, cache_control: { type: "ephemeral" } }],
    tools: [THEME_TOOL],
    tool_choice: { type: "tool", name: THEME_TOOL.name },
    messages: [{ role: "user", content: assessmentMd }],
  });
  const tool = response.content.find((b) => b.type === "tool_use");
  if (!tool || tool.type !== "tool_use") return [];
  const parsed = themesJsonSchema.safeParse(tool.input);
  const themes = parsed.success ? parsed.data.themes.slice(0, 5) : [];

  // Cache on the row.
  db.update(retros)
    .set({ unresolvedThemesJson: themes })
    .where(eq(retros.id, retroId))
    .run();
  return themes;
}

async function loadLatestRetroThemes(apiKey: string): Promise<{
  week: number;
  themes: string[];
} | null> {
  const last = db
    .select({
      id: retros.id,
      week: retros.week,
      assessmentMd: retros.claudeAssessmentMd,
      cached: retros.unresolvedThemesJson,
    })
    .from(retros)
    .where(isNotNull(retros.claudeAssessmentMd))
    .orderBy(desc(retros.week))
    .limit(1)
    .get();
  if (!last || !last.assessmentMd) return null;
  if (last.cached && last.cached.length > 0) {
    return { week: last.week, themes: last.cached };
  }
  // Lazy-extract.
  try {
    const themes = await extractThemesForRetro(apiKey, last.id, last.assessmentMd);
    return { week: last.week, themes };
  } catch {
    return { week: last.week, themes: [] };
  }
}

// ───────── status-line generator ─────────

export const statusJsonSchema = z.object({
  message_md: z.string().min(1),
  pace_label: z.enum(["on_pace", "slightly_behind", "ahead", "off_track"]),
});

export interface StatusResult {
  messageMd: string;
  paceLabel: PaceLabel;
  tokenCost: number;
  model: string;
}

const STATUS_SYSTEM = `Write one paragraph (2-4 sentences) stating exactly where this developer is on their 14-week plan. Facts only. No motivation. No "keep going." Name: pace relative to plan, one specific thing they recently passed, one specific thing still open. If they're off pace, say so. If they've been stuck on the same task 3+ days, say so by name. End with the single most important open thread they should close this week. Sound like a direct manager reading status, not a chatbot.`;

const STATUS_TOOL = {
  name: "submit_status",
  description: "Return today's status paragraph + a pace label.",
  input_schema: {
    type: "object" as const,
    properties: {
      message_md: { type: "string" },
      pace_label: {
        type: "string",
        enum: ["on_pace", "slightly_behind", "ahead", "off_track"],
      },
    },
    required: ["message_md", "pace_label"],
  },
};

function userMessage(ctx: PaceContext, retroThemes: { week: number; themes: string[] } | null) {
  const lines: string[] = [];
  lines.push(`Date: ${ctx.todayDate}`);
  if (ctx.currentPointer) {
    lines.push(`Current pointer: Week ${ctx.currentPointer.week} · Day ${ctx.currentPointer.day}`);
  } else {
    lines.push("Current pointer: (no open tasks)");
  }
  lines.push(
    `Plan progress: ${ctx.passedCount}/${ctx.totalPlanTasks} passed; expected ≈ ${ctx.expectedByToday} by today (1/day from earliest started_at).`,
  );
  lines.push(
    ctx.daysSinceLastPass != null
      ? `Days since last pass: ${ctx.daysSinceLastPass}`
      : "Days since last pass: (no passes yet)",
  );
  lines.push(`Snoozed tasks: ${ctx.snoozedCount}`);
  if (ctx.overdueRetroWeeks.length > 0) {
    lines.push(`Overdue retros: weeks ${ctx.overdueRetroWeeks.join(", ")}`);
  } else {
    lines.push("Overdue retros: none");
  }

  lines.push("");
  lines.push("Currently in progress (most-stale first):");
  if (ctx.inProgress.length === 0) lines.push("  (none)");
  else
    for (const t of ctx.inProgress)
      lines.push(
        `  - W${t.week}D${t.day} #${t.id} "${t.title}" — ${t.daysInProgress != null ? `${t.daysInProgress}d in progress` : "started_at unknown"}`,
      );

  lines.push("");
  lines.push("Recently passed (newest first):");
  if (ctx.recentlyPassed.length === 0) lines.push("  (none)");
  else
    for (const t of ctx.recentlyPassed)
      lines.push(`  - W${t.week}D${t.day} #${t.id} "${t.title}" passed ${t.passedAt}`);

  lines.push("");
  if (retroThemes && retroThemes.themes.length > 0) {
    lines.push(
      `Last retro (Week ${retroThemes.week}) unresolved themes: ${retroThemes.themes.join(", ")}`,
    );
  } else {
    lines.push("Last retro unresolved themes: (none cached or no retros yet)");
  }

  return lines.join("\n");
}

export async function generateStatusLine(): Promise<StatusResult> {
  const { apiKey, gradingModel } = await readSettings();
  if (!apiKey) throw new MissingApiKeyError();

  const ctx = gatherPaceContext();
  const retroThemes = await loadLatestRetroThemes(apiKey);

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL_IDS[gradingModel],
    max_tokens: 200,
    temperature: 0.4,
    system: [
      { type: "text", text: STATUS_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    tools: [STATUS_TOOL],
    tool_choice: { type: "tool", name: STATUS_TOOL.name },
    messages: [{ role: "user", content: userMessage(ctx, retroThemes) }],
  });

  const tool = response.content.find((b) => b.type === "tool_use");
  if (!tool || tool.type !== "tool_use") {
    throw new Error("Anthropic response missing tool_use block.");
  }
  const parsed = statusJsonSchema.parse(tool.input);

  const tokenCost =
    (response.usage.input_tokens ?? 0) +
    (response.usage.output_tokens ?? 0) +
    (response.usage.cache_creation_input_tokens ?? 0) +
    (response.usage.cache_read_input_tokens ?? 0);

  return {
    messageMd: parsed.message_md,
    paceLabel: parsed.pace_label,
    tokenCost,
    model: MODEL_IDS[gradingModel],
  };
}

export function loadTodayStatusLine() {
  return (
    db
      .select()
      .from(statusLines)
      .where(eq(statusLines.statusDate, todayLocalDate()))
      .get() ?? null
  );
}

// ───────── shipped-this-week (no Anthropic) ─────────

export interface ShippedThisWeek {
  passed: Array<{ id: number; week: number; day: number; title: string }>;
  retroWeeks: number[];
  noteTaskTitles: string[];
}

export function loadShippedThisWeek(): ShippedThisWeek {
  const monday = startOfWeekLocal();

  const passedRows = db
    .select({ id: tasks.id, week: tasks.week, day: tasks.day, title: tasks.title })
    .from(submissions)
    .innerJoin(tasks, eq(tasks.id, submissions.taskId))
    .where(
      and(
        inArray(submissions.grade, ["pass"]),
        gte(submissions.submittedAt, monday),
      ),
    )
    .orderBy(asc(tasks.week), asc(tasks.day))
    .all();
  const passedSeen = new Set<number>();
  const passed = passedRows.filter((r) => {
    if (passedSeen.has(r.id)) return false;
    passedSeen.add(r.id);
    return true;
  });

  const retroWeeks = db
    .select({ week: retros.week })
    .from(retros)
    .where(gte(retros.generatedAt, monday))
    .orderBy(asc(retros.week))
    .all()
    .map((r) => r.week);

  const noteTaskTitles = db
    .select({ title: tasks.title })
    .from(notes)
    .innerJoin(tasks, eq(tasks.id, notes.taskId))
    .where(and(isNotNull(notes.taskId), gte(notes.createdAt, monday)))
    .orderBy(asc(tasks.week), asc(tasks.day))
    .all()
    .map((r) => r.title);
  // Dedupe while preserving order.
  const seen = new Set<string>();
  const dedupedTitles: string[] = [];
  for (const t of noteTaskTitles) {
    if (seen.has(t)) continue;
    seen.add(t);
    dedupedTitles.push(t);
  }

  // suppress unused
  void sql;
  return { passed, retroWeeks, noteTaskTitles: dedupedTitles };
}

/** Render the Shipped This Week paragraph from the data — no counts, no scores. */
export function renderShippedParagraph(s: ShippedThisWeek): string {
  const clauses: string[] = [];
  if (s.passed.length > 0) {
    clauses.push(`passed ${s.passed.map((p) => `"${p.title}"`).join(", ")}`);
  }
  if (s.retroWeeks.length > 0) {
    if (s.retroWeeks.length === 1) clauses.push(`submitted a retro on Week ${s.retroWeeks[0]}`);
    else clauses.push(`submitted retros on Weeks ${s.retroWeeks.join(", ")}`);
  }
  if (s.noteTaskTitles.length > 0) {
    clauses.push(
      `wrote notes on ${s.noteTaskTitles.map((t) => `"${t}"`).join(", ")}`,
    );
  }
  if (clauses.length === 0) return "";

  let body: string;
  if (clauses.length === 1) {
    body = clauses[0]!;
  } else if (clauses.length === 2) {
    body = `${clauses[0]} and ${clauses[1]}`;
  } else {
    body = `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`;
  }
  return `Since Monday you ${body}.`;
}

// silence
void WEEK_MS;
