import "server-only";
import { z } from "zod";
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { briefings, notes, progress, retros, tasks } from "@/db/schema";
import { generateJson, MissingApiKeyError, Type } from "./gemini";
import { readSettings } from "./env";

// ───────── date helpers ─────────

/** YYYY-MM-DD in the server's local timezone. */
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

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfTodayLocal(): Date {
  const d = startOfTodayLocal();
  d.setDate(d.getDate() + 1);
  return d;
}

const HOUR_MS = 60 * 60 * 1000;

// ───────── phase mapping ─────────

export function phaseForWeek(week: number): string {
  if (week <= 2) return "Foundation + freelance bridge + niche pick";
  if (week <= 6) return "MVP build (AI feature week 3, RAG week 3, payments week 4, polish week 6)";
  if (week <= 10) return "Ship to discovery users + monetize (first paying user)";
  return "Checkpoint + branch (scale / pivot / retry)";
}

// ───────── context gather ─────────

export interface BriefingContext {
  todayDate: string;
  currentPointer: { week: number; day: number } | null;
  phase: string;
  passedRecent: Array<{ id: number; week: number; day: number; title: string; passedAt: string }>;
  inProgress: Array<{
    id: number;
    week: number;
    day: number;
    title: string;
    startedAt: string | null;
    hoursInProgress: number | null;
  }>;
  unsnoozingToday: Array<{ id: number; week: number; day: number; title: string }>;
  recentNotes: Array<{ at: string; body: string; taskTitle: string | null }>;
  lastRetro: { week: number; assessmentMd: string } | null;
  candidateTaskIds: number[];
}

function clamp(text: string, n: number): string {
  if (!text) return "";
  return text.length > n ? text.slice(0, n).trim() + "…" : text;
}

export async function gatherBriefingContext(): Promise<BriefingContext> {
  const todayDate = todayLocalDate();
  const startToday = startOfTodayLocal();
  const endToday = endOfTodayLocal();
  const fortyEightAgo = new Date(Date.now() - 48 * HOUR_MS);

  const ptrRow = await db
    .select({ week: tasks.week, day: tasks.day })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(inArray(progress.status, ["available", "in_progress"]))
    .orderBy(asc(tasks.week), asc(tasks.day))
    .limit(1)
    .get();
  const currentPointer = ptrRow ? { week: ptrRow.week, day: ptrRow.day } : null;
  const phase = currentPointer ? phaseForWeek(currentPointer.week) : "Plan complete";

  const passed = await db
    .select({
      id: tasks.id,
      week: tasks.week,
      day: tasks.day,
      title: tasks.title,
      passedAt: progress.passedAt,
    })
    .from(progress)
    .innerJoin(tasks, eq(tasks.id, progress.taskId))
    .where(and(eq(progress.status, "passed"), isNotNull(progress.passedAt), gte(progress.passedAt, fortyEightAgo)))
    .orderBy(desc(progress.passedAt))
    .all();

  const passedRecent = passed.map((r) => ({
    id: r.id,
    week: r.week,
    day: r.day,
    title: r.title,
    passedAt: (r.passedAt as Date).toISOString(),
  }));

  const inP = await db
    .select({
      id: tasks.id,
      week: tasks.week,
      day: tasks.day,
      title: tasks.title,
      startedAt: progress.startedAt,
    })
    .from(progress)
    .innerJoin(tasks, eq(tasks.id, progress.taskId))
    .where(eq(progress.status, "in_progress"))
    .orderBy(asc(tasks.week), asc(tasks.day))
    .all();

  const now = Date.now();
  const inProgress = inP.map((r) => ({
    id: r.id,
    week: r.week,
    day: r.day,
    title: r.title,
    startedAt: r.startedAt ? (r.startedAt as Date).toISOString() : null,
    hoursInProgress: r.startedAt
      ? Math.round((now - (r.startedAt as Date).getTime()) / HOUR_MS)
      : null,
  }));

  // unsnoozing today (snoozed_until between start of today and end of today)
  const unsnoozingTodaySec = Math.floor(startToday.getTime() / 1000);
  const endTodaySec = Math.floor(endToday.getTime() / 1000);
  const unsnoozing = await db
    .select({
      id: tasks.id,
      week: tasks.week,
      day: tasks.day,
      title: tasks.title,
    })
    .from(progress)
    .innerJoin(tasks, eq(tasks.id, progress.taskId))
    .where(
      sql`${progress.snoozedUntil} >= ${unsnoozingTodaySec} AND ${progress.snoozedUntil} < ${endTodaySec}`,
    )
    .all();

  const recentNoteRows = await db
    .select({
      createdAt: notes.createdAt,
      body: notes.bodyMd,
      taskTitle: tasks.title,
    })
    .from(notes)
    .leftJoin(tasks, eq(tasks.id, notes.taskId))
    .orderBy(desc(notes.createdAt))
    .limit(5)
    .all();

  const recentNotes = recentNoteRows.map((n) => ({
    at: n.createdAt.toISOString(),
    body: clamp(n.body, 400),
    taskTitle: n.taskTitle,
  }));

  const lastRetro = await db
    .select({ week: retros.week, assessmentMd: retros.claudeAssessmentMd })
    .from(retros)
    .where(isNotNull(retros.claudeAssessmentMd))
    .orderBy(desc(retros.week))
    .limit(1)
    .get();

  const nowSec = Math.floor(now / 1000);
  const candidates = await db
    .select({ id: tasks.id })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(
      and(
        inArray(progress.status, ["available", "in_progress"]),
        sql`(${progress.snoozedUntil} IS NULL OR ${progress.snoozedUntil} <= ${nowSec})`,
      ),
    )
    .orderBy(asc(tasks.week), asc(tasks.day))
    .all();
  const candidateTaskIds = candidates.map((c) => c.id);

  // suppress unused import lint
  void lt;

  return {
    todayDate,
    currentPointer,
    phase,
    passedRecent,
    inProgress,
    unsnoozingToday: unsnoozing,
    recentNotes,
    lastRetro: lastRetro
      ? { week: lastRetro.week, assessmentMd: clamp(lastRetro.assessmentMd ?? "", 1500) }
      : null,
    candidateTaskIds,
  };
}

// ───────── AI ─────────

export const briefingJsonSchema = z.object({
  message_md: z.string().min(1),
  priority_task_id: z.union([z.number().int().positive(), z.null()]).nullable(),
});
export type BriefingJson = z.infer<typeof briefingJsonSchema>;

export interface BriefingResult {
  messageMd: string;
  priorityTaskId: number | null;
  tokenCost: number;
  model: string;
}

const SYSTEM_PROMPT = `You are the developer's coach for a 14-week plan to ship a paid niche product. Write a 3-5 sentence briefing for today. First sentence: what the single most important thing to do today is. Second sentence: why, in concrete terms from their recent activity. Third sentence onwards: one specific tactical note — a risk to watch, a shortcut to take, or a blocker to clear. No greeting. No "you've got this." No lists. Sound like a direct manager who read the full status and has opinions. If they're behind pace, say so. If they're drifting off the plan, say so. End by naming the single task_id they should open next.`;

function userMessage(ctx: BriefingContext): string {
  const lines: string[] = [];
  lines.push(`Date: ${ctx.todayDate}`);
  if (ctx.currentPointer) {
    lines.push(`Current pointer: Week ${ctx.currentPointer.week} · Day ${ctx.currentPointer.day}`);
  } else {
    lines.push("Current pointer: (no open tasks)");
  }
  lines.push(`Phase: ${ctx.phase}`);

  lines.push("");
  lines.push("Passed in the last 48 hours:");
  if (ctx.passedRecent.length === 0) lines.push("  (none)");
  else for (const p of ctx.passedRecent) lines.push(`  - W${p.week}D${p.day} #${p.id} "${p.title}" passed ${p.passedAt}`);

  lines.push("");
  lines.push("Currently in progress:");
  if (ctx.inProgress.length === 0) lines.push("  (none)");
  else
    for (const p of ctx.inProgress)
      lines.push(
        `  - W${p.week}D${p.day} #${p.id} "${p.title}" — ${p.hoursInProgress != null ? `${p.hoursInProgress}h in progress` : "started_at unknown"}`,
      );

  lines.push("");
  lines.push("Snoozed tasks unsnoozing today:");
  if (ctx.unsnoozingToday.length === 0) lines.push("  (none)");
  else
    for (const p of ctx.unsnoozingToday)
      lines.push(`  - W${p.week}D${p.day} #${p.id} "${p.title}"`);

  lines.push("");
  lines.push("Last 5 notes (most recent first):");
  if (ctx.recentNotes.length === 0) lines.push("  (none)");
  else
    for (const n of ctx.recentNotes) {
      const tag = n.taskTitle ? `re ${n.taskTitle} | ` : "";
      lines.push(`  - ${n.at} (${tag}body): ${n.body}`);
    }

  lines.push("");
  if (ctx.lastRetro) {
    lines.push(`Most recent retro (Week ${ctx.lastRetro.week}) — Claude assessment excerpt:`);
    lines.push(ctx.lastRetro.assessmentMd);
  } else {
    lines.push("Most recent retro: (none yet)");
  }

  lines.push("");
  lines.push(
    `Candidate task_ids you may pick from for priority_task_id: [${ctx.candidateTaskIds.join(", ") || "none"}]`,
  );
  lines.push("Pick exactly one of these (or null if there are none).");

  return lines.join("\n");
}

export async function generateBriefing(): Promise<BriefingResult> {
  const { apiKey, gradingModel } = await readSettings();
  if (!apiKey) throw new MissingApiKeyError();

  const ctx = await gatherBriefingContext();

  const result = await generateJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: userMessage(ctx),
    model: gradingModel,
    temperature: 0.5,
    maxOutputTokens: 600,
    schema: {
      type: Type.OBJECT,
      properties: {
        message_md: { type: Type.STRING },
        priority_task_id: { type: Type.INTEGER, nullable: true },
      },
      required: ["message_md", "priority_task_id"],
    },
    zodSchema: briefingJsonSchema,
  });

  let priorityTaskId: number | null = null;
  if (typeof result.data.priority_task_id === "number") {
    priorityTaskId = ctx.candidateTaskIds.includes(result.data.priority_task_id)
      ? result.data.priority_task_id
      : ctx.candidateTaskIds[0] ?? null;
  }

  return {
    messageMd: result.data.message_md,
    priorityTaskId,
    tokenCost: result.tokenCost,
    model: result.model,
  };
}

export async function loadTodayBriefing() {
  const date = todayLocalDate();
  return (await db.select().from(briefings).where(eq(briefings.briefingDate, date)).get()) ?? null;
}
