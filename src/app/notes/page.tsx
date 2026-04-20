import Link from "next/link";
import { desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { notes, tasks } from "@/db/schema";
import { Markdown } from "@/components/markdown";
import { QuickNoteForm } from "@/components/quick-note-form";
import { DeleteNoteButton } from "@/components/delete-note-button";
import { NotesFilterSelect, type TaskOption } from "@/components/notes-filter-select";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type Filter = { kind: "all" } | { kind: "week" } | { kind: "task"; taskId: number };

function parseFilter(raw: string | undefined): Filter {
  if (!raw || raw === "all") return { kind: "all" };
  if (raw === "week") return { kind: "week" };
  const m = /^task-(\d+)$/.exec(raw);
  if (m) return { kind: "task", taskId: Number(m[1]) };
  return { kind: "all" };
}

/** Monday 00:00 of current week, local server time. */
function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default async function NotesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = typeof sp.filter === "string" ? sp.filter : undefined;
  const filter = parseFilter(raw);

  const baseQuery = db
    .select({
      id: notes.id,
      createdAt: notes.createdAt,
      body: notes.bodyMd,
      taskId: notes.taskId,
      taskTitle: tasks.title,
      taskWeek: tasks.week,
      taskDay: tasks.day,
    })
    .from(notes)
    .leftJoin(tasks, eq(tasks.id, notes.taskId))
    .orderBy(desc(notes.createdAt));

  const rows = await (filter.kind === "week"
    ? baseQuery.where(gte(notes.createdAt, startOfWeek())).all()
    : filter.kind === "task"
      ? baseQuery.where(eq(notes.taskId, filter.taskId)).all()
      : baseQuery.all());

  const taskOptionsRaw = await db
    .select({
      taskId: notes.taskId,
      week: tasks.week,
      day: tasks.day,
      title: tasks.title,
      count: sql<number>`COUNT(*)`,
    })
    .from(notes)
    .innerJoin(tasks, eq(tasks.id, notes.taskId))
    .groupBy(notes.taskId, tasks.week, tasks.day, tasks.title)
    .orderBy(tasks.week, tasks.day)
    .all();

  const taskOptions: TaskOption[] = taskOptionsRaw
    .filter((r): r is typeof r & { taskId: number } => r.taskId !== null)
    .map((r) => ({
      taskId: r.taskId,
      label: `W${r.week} D${r.day} · ${r.title}${r.count > 1 ? ` (${r.count})` : ""}`,
    }));

  const filterValue =
    filter.kind === "all" ? "all" : filter.kind === "week" ? "week" : `task-${filter.taskId}`;

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_340px]">
      <section className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} {rows.length === 1 ? "entry" : "entries"}
              {filter.kind === "week" ? " this week" : null}
              {filter.kind === "task" ? " on this task" : null}.
            </p>
          </div>
          <NotesFilterSelect value={filterValue} taskOptions={taskOptions} />
        </header>

        {rows.length === 0 ? (
          <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
            {filter.kind === "all"
              ? "No notes yet. Jot one on the right."
              : "No notes match this filter."}
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((n) => (
              <li key={n.id}>
                <article className="rounded-lg border bg-card p-5 shadow-sm">
                  <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      <time dateTime={n.createdAt.toISOString()}>
                        {n.createdAt.toLocaleString()}
                      </time>
                      {n.taskId && n.taskTitle ? (
                        <>
                          {" · "}
                          <Link
                            href={`/task/${n.taskId}`}
                            className="text-primary hover:underline"
                          >
                            W{n.taskWeek} D{n.taskDay} · {n.taskTitle}
                          </Link>
                        </>
                      ) : null}
                    </div>
                    <DeleteNoteButton noteId={n.id} />
                  </header>
                  <Markdown>{n.body}</Markdown>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">New note</h2>
          <QuickNoteForm compact />
        </div>
      </aside>
    </div>
  );
}
