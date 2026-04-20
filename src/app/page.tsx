import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-dot";
import { QuickNoteForm } from "@/components/quick-note-form";
import { BriefingCard } from "@/components/briefing-card";
import { StatusLineCard } from "@/components/status-line-card";
import { PacePill } from "@/components/pace-pill";
import { ShippedThisWeek } from "@/components/shipped-this-week";
import { loadTodayStatusLine } from "@/lib/status";
import type { StatusLine } from "@/db/schema";
import { readSettings } from "@/lib/env";
import { recentPushCommits, type RecentCommit } from "@/lib/github";
import { currentPointer, progressSummary, todaysTasks } from "@/lib/progress";
import { retroBanners, type RetroBanner } from "@/lib/retro";
import type { SubmissionType } from "@/db/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<SubmissionType, string> = {
  github_commit: "github commit",
  text_answer: "text answer",
  url: "url",
};

export default async function HomePage() {
  const [pointer, summary, today, banners, settings, status] = await Promise.all([
    currentPointer(),
    progressSummary(),
    todaysTasks(),
    retroBanners(),
    readSettings(),
    loadTodayStatusLine() as Promise<StatusLine | null>,
  ]);
  const githubUsername = settings.githubUsername;
  const commits = await recentPushCommits(githubUsername, 5);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-6">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Current</div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {pointer ? `Week ${pointer.week} · Day ${pointer.day}` : "All tasks passed"}
            </h1>
            {status ? (
              <PacePill
                label={status.paceLabel}
                weekNumber={pointer?.week ?? null}
                statusMessageMd={status.messageMd}
              />
            ) : null}
          </div>
        </div>
        <ProgressBar summary={summary} />
      </header>

      <StatusLineCard />

      <BriefingCard />

      {banners.length > 0 ? (
        <div className="space-y-2">
          {banners.map((b) => (
            <RetroBannerCard key={`${b.kind}-${b.week}`} banner={b} />
          ))}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Today's tasks</h2>
            {today.length === 0 ? (
              <EmptyTasks />
            ) : (
              <ul className="space-y-3">
                {today.map((t) => (
                  <li key={t.id}>
                    <article className="rounded-lg border bg-card p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Week {t.week} · Day {t.day}</span>
                            <span>·</span>
                            <span>{TYPE_LABEL[t.submissionType]}</span>
                            <span>·</span>
                            <span>{t.estimatedHours}h</span>
                          </div>
                          <h3 className="truncate text-base font-semibold">{t.title}</h3>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Link href={`/task/${t.id}`}>
                          <Button size="sm">Open</Button>
                        </Link>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ShippedThisWeek />

          <div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Shortcuts</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <ShortcutLink
                href="/plan"
                title="Plan"
                subtitle="All 14 weeks, 98 tasks"
              />
              <ShortcutLink
                href="/notes"
                title="Notes"
                subtitle="Journal + quick jots"
              />
              <ShortcutLink
                href="/settings"
                title="Settings"
                subtitle="API key + models"
              />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <CommitsCard username={githubUsername} commits={commits} />

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Quick note</h2>
            <QuickNoteForm compact />
          </div>
        </aside>
      </section>
    </div>
  );
}

function RetroBannerCard({ banner }: { banner: RetroBanner }) {
  const isOverdue = banner.kind === "overdue";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm",
        isOverdue
          ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {isOverdue
            ? `Week ${banner.week} retro overdue.`
            : `Week ${banner.week} complete. Ready for retro?`}
        </span>
        {isOverdue ? (
          <span className="text-xs text-muted-foreground">
            Last task passed {banner.daysOverdue} days ago.
          </span>
        ) : null}
      </div>
      <Link href={`/retro/${banner.week}`}>
        <Button size="sm" variant={isOverdue ? "default" : "outline"}>
          {isOverdue ? "Catch up retro" : "Start retro"}
        </Button>
      </Link>
    </div>
  );
}

function ProgressBar({ summary }: { summary: { passed: number; total: number; pct: number } }) {
  return (
    <div className="w-full text-left md:w-auto md:min-w-[220px] md:text-right">
      <div className="text-xs text-muted-foreground">Progress</div>
      <div className="text-sm font-medium">
        {summary.passed} / {summary.total} passed · {summary.pct}%
      </div>
      <div
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={summary.total}
        aria-valuenow={summary.passed}
      >
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${summary.pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyTasks() {
  return (
    <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
      Nothing available right now. Pass the current task to unlock the next — or pick up where you
      left off on the{" "}
      <Link href="/plan" className="text-primary hover:underline">
        plan
      </Link>
      .
    </div>
  );
}

function CommitsCard({
  username,
  commits,
}: {
  username: string;
  commits: RecentCommit[];
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent commits</h2>
        <a
          href={`https://github.com/${encodeURIComponent(username)}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          @{username}
        </a>
      </div>
      {commits.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No recent PushEvents found (public API — 60 req/h limit).
        </p>
      ) : (
        <ul className="space-y-2">
          {commits.map((c) => {
            const repoShort = c.repo.includes("/") ? c.repo.split("/")[1] : c.repo;
            return (
              <li key={c.sha} className="text-xs">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded px-2 py-1.5 transition-colors hover:bg-muted/50"
                >
                  <div className="truncate font-medium">{c.message}</div>
                  <div className="mt-0.5 text-muted-foreground">
                    {repoShort} · {relativeTime(c.date)}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ShortcutLink({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </Link>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 45) return "just now";
  if (s < 90) return "1m ago";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}
