import "server-only";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

const ENV_FILE = resolve(process.cwd(), ".env.local");

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

async function readDotEnv(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(ENV_FILE, "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1).replace(/\\"/g, '"');
      }
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function serialize(values: Record<string, string>) {
  const body = Object.entries(values)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => {
      const needsQuote = /[\s#"']/.test(v);
      const escaped = needsQuote ? `"${v.replace(/"/g, '\\"')}"` : v;
      return `${k}=${escaped}`;
    })
    .join("\n");
  return body + (body.length > 0 ? "\n" : "");
}

function pickBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return fallback;
}

function pickModel(raw: string | undefined, fallback: ModelChoice): ModelChoice {
  const parsed = modelSchema.safeParse(raw);
  return parsed.success ? parsed.data : fallback;
}

function pickHours(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return STUCK_HOURS_DEFAULT;
  return Math.min(STUCK_HOURS_MAX, Math.max(STUCK_HOURS_MIN, Math.round(n)));
}

/**
 * Read settings fresh every call so /settings changes take effect without a
 * server restart.
 */
export async function readSettings(): Promise<Settings> {
  const env = await readDotEnv();
  const apiKey = env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? "";
  const githubUsername =
    env.GITHUB_USERNAME ?? process.env.GITHUB_USERNAME ?? "aalamkh";
  const lessonModel = pickModel(env.LESSON_MODEL ?? process.env.LESSON_MODEL, "opus");
  const gradingModel = pickModel(env.GRADING_MODEL ?? process.env.GRADING_MODEL, "opus");

  const dailyBriefingEnabled = pickBool(
    env.COACH_DAILY_BRIEFING_ENABLED ?? process.env.COACH_DAILY_BRIEFING_ENABLED,
    true,
  );
  const stuckDetectorEnabled = pickBool(
    env.COACH_STUCK_DETECTOR_ENABLED ?? process.env.COACH_STUCK_DETECTOR_ENABLED,
    true,
  );
  const stuckHoursThreshold = pickHours(
    env.COACH_STUCK_HOURS ?? process.env.COACH_STUCK_HOURS,
  );
  const nextActionModel = pickModel(
    env.COACH_NEXT_ACTION_MODEL ?? process.env.COACH_NEXT_ACTION_MODEL,
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

export async function writeDotEnv(patch: Record<string, string>) {
  const current = await readDotEnv();
  const next = { ...current, ...patch };
  await writeFile(ENV_FILE, serialize(next), "utf8");
}

export function maskedKey(apiKey: string): string {
  if (!apiKey) return "";
  if (apiKey.length <= 12) return "***";
  return `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`;
}
