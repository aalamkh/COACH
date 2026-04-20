import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { settings, type SettingsRow } from "@/db/schema";

export const MODEL_IDS = {
  opus: "claude-opus-4-7",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
} as const;

export const modelSchema = z.enum(["opus", "sonnet", "haiku"]);
export type ModelChoice = z.infer<typeof modelSchema>;

export interface Settings {
  apiKey: string;
  githubUsername: string;
  lessonModel: ModelChoice;
  gradingModel: ModelChoice;
  dailyBriefingEnabled: boolean;
  stuckDetectorEnabled: boolean;
  stuckHoursThreshold: number;
  nextActionModel: ModelChoice;
}

export const STUCK_HOURS_MIN = 6;
export const STUCK_HOURS_MAX = 72;
export const STUCK_HOURS_DEFAULT = 24;

function parseBool(raw: string | undefined | null, fallback: boolean): boolean {
  if (raw === undefined || raw === null) return fallback;
  const v = raw.toString().trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return fallback;
}

function parseModel(raw: string | undefined | null, fallback: ModelChoice): ModelChoice {
  const parsed = modelSchema.safeParse(raw);
  return parsed.success ? parsed.data : fallback;
}

function parseHours(raw: string | number | undefined | null): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return STUCK_HOURS_DEFAULT;
  return Math.min(STUCK_HOURS_MAX, Math.max(STUCK_HOURS_MIN, Math.round(n)));
}

async function loadSettingsRow(): Promise<SettingsRow | null> {
  try {
    return (await db.select().from(settings).where(eq(settings.id, 1)).get()) ?? null;
  } catch {
    // Table may not exist yet (first boot before db:push) — treat as empty.
    return null;
  }
}

/**
 * Read settings. Precedence: env var → DB row → default. Env-set values are
 * useful for Netlify / local-override; the DB row holds the user's edits via
 * /settings.
 */
export async function readSettings(): Promise<Settings> {
  const row = await loadSettingsRow();

  const apiKey = process.env.ANTHROPIC_API_KEY ?? row?.anthropicApiKey ?? "";
  const githubUsername =
    process.env.GITHUB_USERNAME ?? row?.githubUsername ?? "aalamkh";

  const lessonModel = parseModel(
    process.env.LESSON_MODEL ?? row?.lessonModel ?? null,
    "opus",
  );
  const gradingModel = parseModel(
    process.env.GRADING_MODEL ?? row?.gradingModel ?? null,
    "opus",
  );

  const dailyBriefingEnabled = parseBool(
    process.env.COACH_DAILY_BRIEFING_ENABLED,
    row?.dailyBriefingEnabled ?? true,
  );
  const stuckDetectorEnabled = parseBool(
    process.env.COACH_STUCK_DETECTOR_ENABLED,
    row?.stuckDetectorEnabled ?? true,
  );
  const stuckHoursThreshold = parseHours(
    process.env.COACH_STUCK_HOURS ?? row?.stuckHoursThreshold ?? null,
  );
  const nextActionModel = parseModel(
    process.env.COACH_NEXT_ACTION_MODEL ?? row?.nextActionModel ?? null,
    "haiku",
  );

  return {
    apiKey,
    githubUsername,
    lessonModel,
    gradingModel,
    dailyBriefingEnabled,
    stuckDetectorEnabled,
    stuckHoursThreshold,
    nextActionModel,
  };
}

export function maskedKey(apiKey: string): string {
  if (!apiKey) return "";
  if (apiKey.length <= 12) return "***";
  return `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`;
}

/** Upsert the single settings row. Null values leave the existing value alone. */
export async function updateSettingsRow(patch: {
  anthropicApiKey?: string | null;
  githubUsername?: string | null;
  lessonModel?: ModelChoice | null;
  gradingModel?: ModelChoice | null;
  dailyBriefingEnabled?: boolean | null;
  stuckDetectorEnabled?: boolean | null;
  stuckHoursThreshold?: number | null;
  nextActionModel?: ModelChoice | null;
}): Promise<void> {
  const existing = await loadSettingsRow();
  if (!existing) {
    await db
      .insert(settings)
      .values({
        id: 1,
        anthropicApiKey: patch.anthropicApiKey ?? null,
        githubUsername: patch.githubUsername ?? null,
        lessonModel: patch.lessonModel ?? null,
        gradingModel: patch.gradingModel ?? null,
        dailyBriefingEnabled: patch.dailyBriefingEnabled ?? null,
        stuckDetectorEnabled: patch.stuckDetectorEnabled ?? null,
        stuckHoursThreshold: patch.stuckHoursThreshold ?? null,
        nextActionModel: patch.nextActionModel ?? null,
        updatedAt: new Date(),
      })
      .run();
    return;
  }
  const next: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== null) next[k] = v;
  }
  await db.update(settings).set(next).where(eq(settings.id, 1)).run();
}
