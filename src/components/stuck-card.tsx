import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { unblockSuggestions, type UnblockSuggestion } from "@/db/schema";
import { Markdown } from "@/components/markdown";
import { UnblockButton } from "@/components/unblock-button";
import { DismissSuggestionButton } from "@/components/dismiss-suggestion-button";
import { readSettings } from "@/lib/env";

const HOUR_MS = 60 * 60 * 1000;

interface Props {
  taskId: number;
  status: string;
  startedAt: Date | null;
  snoozedUntil: Date | null;
}

export async function StuckCard({ taskId, status, startedAt, snoozedUntil }: Props) {
  const { stuckDetectorEnabled, stuckHoursThreshold } = await readSettings();
  if (!stuckDetectorEnabled) return null;
  if (status !== "in_progress") return null;
  if (!startedAt) return null;
  const ageMs = Date.now() - startedAt.getTime();
  if (ageMs < stuckHoursThreshold * HOUR_MS) return null;
  if (snoozedUntil && snoozedUntil.getTime() > Date.now()) return null;

  const hours = Math.floor(ageMs / HOUR_MS);
  const days = Math.floor(hours / 24);
  const ageLabel =
    days >= 1
      ? `${days} day${days === 1 ? "" : "s"}`
      : `${hours} hour${hours === 1 ? "" : "s"}`;

  const open = db
    .select()
    .from(unblockSuggestions)
    .where(
      and(
        eq(unblockSuggestions.taskId, taskId),
        isNull(unblockSuggestions.dismissedAt),
      ),
    )
    .orderBy(asc(unblockSuggestions.generatedAt))
    .all() as UnblockSuggestion[];

  return (
    <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
      <header className="mb-2 flex items-start gap-3">
        <ClockIcon />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            You started this {ageLabel} ago. Want unblocking help?
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            One Anthropic call. Reads the task, your notes on it, and your latest submission
            attempt.
          </p>
        </div>
      </header>
      <UnblockButton taskId={taskId} />

      {open.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {open.map((s) => (
            <li key={s.id}>
              <article className="rounded-md border bg-background p-4">
                <header className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{s.generatedAt.toLocaleString()}</span>
                  <DismissSuggestionButton id={s.id} taskId={taskId} />
                </header>
                <Markdown>{s.suggestionMd}</Markdown>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ClockIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
