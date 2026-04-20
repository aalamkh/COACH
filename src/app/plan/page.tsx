import Link from "next/link";
import { asc, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { progress, tasks, type Status, type SubmissionType } from "@/db/schema";
import { StatusDot } from "@/components/status-dot";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  week: number;
  day: number;
  title: string;
  submissionType: SubmissionType;
  estimatedHours: number;
  status: Status;
  snoozedUntil: Date | null;
}

const TYPE_LABEL: Record<SubmissionType, string> = {
  github_commit: "github commit",
  text_answer: "text answer",
  url: "url",
};

export default async function PlanPage() {
  const rows = (await db
    .select({
      id: tasks.id,
      week: tasks.week,
      day: tasks.day,
      title: tasks.title,
      submissionType: tasks.submissionType,
      estimatedHours: tasks.estimatedHours,
      status: progress.status,
      snoozedUntil: progress.snoozedUntil,
    })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(gt(tasks.week, 0))
    .orderBy(asc(tasks.week), asc(tasks.day))
    .all()) as Row[];

  const byWeek = new Map<number, Row[]>();
  for (const r of rows) {
    const bucket = byWeek.get(r.week) ?? [];
    bucket.push(r);
    byWeek.set(r.week, bucket);
  }

  const weeks = Array.from(byWeek.entries()).sort(([a], [b]) => a - b);
  const activeWeek = weeks.find(([, ts]) => ts.some((t) => t.status !== "passed"))?.[0] ?? 1;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <p className="text-sm text-muted-foreground">
          14 weeks · 98 tasks · click any task to open it.
        </p>
      </header>

      <div className="space-y-2">
        {weeks.map(([week, weekTasks]) => {
          const passed = weekTasks.filter((t) => t.status === "passed").length;
          return (
            <details
              key={week}
              open={week === activeWeek}
              className="group rounded-lg border bg-card shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium">
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground transition group-open:rotate-90">
                    ▶
                  </span>
                  <span>Week {week}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {passed}/{weekTasks.length} passed
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  {weekTasks.map((t) => (
                    <StatusDot key={t.id} status={t.status} />
                  ))}
                </span>
              </summary>

              <ul className="divide-y border-t">
                {weekTasks.map((t) => {
                  const snoozedActive =
                    t.snoozedUntil != null && t.snoozedUntil.getTime() > Date.now();
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/task/${t.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/50"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <StatusDot status={t.status} />
                          <span className="w-14 shrink-0 text-xs text-muted-foreground">
                            Day {t.day}
                          </span>
                          <span className="truncate">{t.title}</span>
                          {snoozedActive ? (
                            <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Snoozed until {t.snoozedUntil!.toLocaleDateString()}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                          <span>{TYPE_LABEL[t.submissionType]}</span>
                          <span>{t.estimatedHours}h</span>
                          <span>›</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
