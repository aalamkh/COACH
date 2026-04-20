import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { progress, tasks, type Status } from "@/db/schema";
import { StatusDot } from "@/components/status-dot";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  day: number;
  title: string;
  estimatedHours: number;
  status: Status;
}

export default async function AITrackPage() {
  const rows = db
    .select({
      id: tasks.id,
      day: tasks.day,
      title: tasks.title,
      estimatedHours: tasks.estimatedHours,
      status: progress.status,
    })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(eq(tasks.week, 0))
    .orderBy(asc(tasks.day))
    .all() as Row[];

  const passed = rows.filter((r) => r.status === "passed").length;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Untimed track</div>
        <h1 className="text-2xl font-semibold tracking-tight">AI concepts</h1>
        <p className="text-sm text-muted-foreground">
          24 short lessons on what AI actually is and how to think about it as a builder. All open
          from day one — pick whichever topic is in your way today. Doesn't count toward the
          14-week plan progress.
        </p>
        <p className="text-xs text-muted-foreground">
          {passed} / {rows.length} passed
        </p>
      </header>

      <ol className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/task/${r.id}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-muted/50"
            >
              <StatusDot status={r.status} />
              <span className="w-10 shrink-0 text-xs text-muted-foreground">#{r.day}</span>
              <span className="flex-1 truncate">{r.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{r.estimatedHours}h</span>
              <span className="shrink-0 text-xs text-muted-foreground">›</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
