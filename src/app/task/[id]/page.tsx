import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  lessons,
  progress,
  submissions,
  tasks,
  type Grade,
  type Lesson,
  type Status,
  type SubmissionType,
} from "@/db/schema";
import { Markdown } from "@/components/markdown";
import { GradeBadge, StatusBadge, StatusDot } from "@/components/status-dot";
import { SubmissionForm } from "@/components/submission-form";
import { OverrideButton } from "@/components/override-button";
import { SnoozeButtons } from "@/components/snooze-buttons";
import { LessonAutoGenerator } from "@/components/lesson-auto-generator";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { RegenerateLessonButton } from "@/components/regenerate-lesson-button";
import { RegenerateLessonSimplerButton } from "@/components/regenerate-lesson-simpler-button";
import { QuizQuestionInline, type InlineInitialAttempt, type InlineQuestion } from "@/components/quiz-question-inline";
import type { InitialAttempt, QuizQuestion } from "@/components/quiz-section";
import { QuizGateBadge } from "@/components/quiz-gate-badge";
import { QuickNoteForm } from "@/components/quick-note-form";
import { ChangedView } from "@/components/changed-view";
import { StuckCard } from "@/components/stuck-card";
import { NextActionButton } from "@/components/next-action-button";
import { readSettings } from "@/lib/env";
import { loadLessonQuiz, type QuizGateState } from "@/lib/quiz";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const tabSchema = z.enum(["task", "history", "lesson"]);
type Tab = z.infer<typeof tabSchema>;

const TYPE_LABEL: Record<SubmissionType, string> = {
  github_commit: "github commit",
  text_answer: "text answer",
  url: "url",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface TaskRow {
  id: number;
  week: number;
  day: number;
  title: string;
  descriptionMd: string;
  successCriteriaMd: string;
  submissionType: SubmissionType;
  estimatedHours: number;
  status: Status;
  snoozedUntil: Date | null;
  startedAt: Date | null;
}

interface SubmissionRow {
  id: number;
  submittedAt: Date;
  content: string;
  feedbackMd: string | null;
  grade: Grade | null;
  tokenCost: number | null;
  previousSubmissionId: number | null;
}

export default async function TaskPage({ params, searchParams }: PageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId <= 0) notFound();

  const row = db
    .select({
      id: tasks.id,
      week: tasks.week,
      day: tasks.day,
      title: tasks.title,
      descriptionMd: tasks.descriptionMd,
      successCriteriaMd: tasks.successCriteriaMd,
      submissionType: tasks.submissionType,
      estimatedHours: tasks.estimatedHours,
      status: progress.status,
      snoozedUntil: progress.snoozedUntil,
      startedAt: progress.startedAt,
    })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(eq(tasks.id, taskId))
    .get() as TaskRow | undefined;
  if (!row) notFound();

  const subs = db
    .select({
      id: submissions.id,
      submittedAt: submissions.submittedAt,
      content: submissions.content,
      feedbackMd: submissions.feedbackMd,
      grade: submissions.grade,
      tokenCost: submissions.tokenCost,
      previousSubmissionId: submissions.previousSubmissionId,
    })
    .from(submissions)
    .where(eq(submissions.taskId, taskId))
    .orderBy(desc(submissions.submittedAt))
    .all() as SubmissionRow[];

  const lesson = db
    .select()
    .from(lessons)
    .where(eq(lessons.taskId, taskId))
    .get() as Lesson | undefined;

  const quiz = loadLessonQuiz(lesson?.id ?? null);

  const hasPassed = subs.some((s) => s.grade === "pass" || s.grade === "manual");
  const settings = await readSettings();
  const apiKeyMissing = settings.apiKey === "";

  // Default tab: lesson if lesson exists AND not yet passed; otherwise task.
  const explicit = typeof sp.tab === "string" ? tabSchema.safeParse(sp.tab) : null;
  const tab: Tab =
    explicit && explicit.success ? explicit.data : lesson && !hasPassed ? "lesson" : "task";

  const weekTasks = db
    .select({
      id: tasks.id,
      day: tasks.day,
      title: tasks.title,
      status: progress.status,
    })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(eq(tasks.week, row.week))
    .orderBy(asc(tasks.day))
    .all() as Array<{ id: number; day: number; title: string; status: Status }>;

  const idx = weekTasks.findIndex((t) => t.id === row.id);
  const prev = idx > 0 ? weekTasks[idx - 1]! : null;
  const next = idx >= 0 && idx < weekTasks.length - 1 ? weekTasks[idx + 1]! : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <div className="min-w-0 space-y-6">
        <Link
          href={row.week === 0 ? "/ai-track" : "/plan"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← {row.week === 0 ? "AI track" : "Plan"}
        </Link>

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {row.week === 0 ? (
              <>
                <span>AI track</span>
                <span>·</span>
                <span>#{row.day}</span>
              </>
            ) : (
              <>
                <span>Week {row.week}</span>
                <span>·</span>
                <span>Day {row.day}</span>
              </>
            )}
            <span>·</span>
            <span>{TYPE_LABEL[row.submissionType]}</span>
            <span>·</span>
            <span>{row.estimatedHours}h</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{row.title}</h1>
            <StatusBadge status={row.status} />
          </div>
        </header>

        <Tabs current={tab} taskId={row.id} submissionCount={subs.length} hasLesson={!!lesson} />

        {tab === "task" ? (
          <TaskTab
            row={row}
            submissions={subs}
            quizGate={quiz?.gate ?? { kind: "no_lesson" }}
          />
        ) : null}
        {tab === "history" ? (
          <HistoryTab submissions={subs} submissionType={row.submissionType} />
        ) : null}
        {tab === "lesson" ? (
          <LessonTab
            taskId={row.id}
            lesson={lesson ?? null}
            quizQuestions={quiz?.questions ?? []}
            initialQuizAttempts={initialQuizAttemptsFor(quiz)}
            apiKeyMissing={apiKeyMissing}
          />
        ) : null}

        {/* Always mount the auto-generator (in any tab) so the lesson is ready
            by the time the user opens the Lesson tab. Renders nothing when not
            generating. */}
        {!lesson && !apiKeyMissing && tab !== "lesson" ? (
          <BackgroundLessonGenerator taskId={row.id} />
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <SideNav weekTasks={weekTasks} currentId={row.id} week={row.week} prev={prev} next={next} />
      </aside>
    </div>
  );
}

function Tabs({
  current,
  taskId,
  submissionCount,
  hasLesson,
}: {
  current: Tab;
  taskId: number;
  submissionCount: number;
  hasLesson: boolean;
}) {
  const items: Array<{ key: Tab; label: string; count?: number; dot?: boolean }> = [
    { key: "task", label: "Task" },
    { key: "history", label: "History", count: submissionCount },
    { key: "lesson", label: "Lesson", dot: hasLesson },
  ];
  return (
    <nav className="flex gap-1 border-b">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.key === "task" ? `/task/${taskId}` : `/task/${taskId}?tab=${it.key}`}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
            current === it.key
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {it.label}
          {typeof it.count === "number" && it.count > 0 ? (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
              {it.count}
            </span>
          ) : null}
          {it.dot ? <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
        </Link>
      ))}
    </nav>
  );
}

function TaskTab({
  row,
  submissions,
  quizGate,
}: {
  row: TaskRow;
  submissions: SubmissionRow[];
  quizGate: QuizGateState;
}) {
  const latest = submissions[0] ?? null;
  const hasAnySubmission = submissions.length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Description
        </h2>
        <Markdown>{row.descriptionMd}</Markdown>
      </section>
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Success criteria
        </h2>
        <Markdown>{row.successCriteriaMd}</Markdown>
      </section>

      <QuizGateBadge state={quizGate} taskId={row.id} />

      <StuckCard
        taskId={row.id}
        status={row.status}
        startedAt={row.startedAt}
        snoozedUntil={row.snoozedUntil}
      />

      <NextActionButton taskId={row.id} />

      <SubmissionForm
        taskId={row.id}
        submissionType={row.submissionType}
        resubmit={hasAnySubmission}
      />

      <div className="flex flex-wrap items-center gap-2">
        {row.status !== "passed" ? (
          <>
            <OverrideButton taskId={row.id} />
            <SnoozeButtons
              taskId={row.id}
              snoozedUntilIso={row.snoozedUntil?.toISOString() ?? null}
            />
          </>
        ) : (
          <span className="text-xs text-emerald-700 dark:text-emerald-300">
            This task is passed.
          </span>
        )}
      </div>

      {latest ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Latest feedback</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(latest.submittedAt).toLocaleString()}</span>
              {latest.grade ? <GradeBadge grade={latest.grade} /> : null}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            {latest.grade === "pending" ? (
              <p className="text-sm text-muted-foreground">
                Grading didn't finish. Try again from the form above.
              </p>
            ) : latest.feedbackMd ? (
              <Markdown>{latest.feedbackMd}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">No feedback recorded.</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Quick note on this task</h2>
        <QuickNoteForm taskId={row.id} compact />
      </section>
    </div>
  );
}

function HistoryTab({
  submissions,
  submissionType,
}: {
  submissions: SubmissionRow[];
  submissionType: SubmissionType;
}) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
        No submissions yet.
      </div>
    );
  }
  // Index by id so each resubmission can look up its predecessor's content.
  const byId = new Map<number, SubmissionRow>();
  for (const s of submissions) byId.set(s.id, s);

  return (
    <ul className="space-y-3">
      {submissions.map((s) => {
        const prev =
          s.previousSubmissionId != null ? byId.get(s.previousSubmissionId) : undefined;
        return (
          <li key={s.id}>
            <article className="rounded-lg border bg-card p-5 shadow-sm">
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(s.submittedAt).toLocaleString()}</span>
                  {typeof s.tokenCost === "number" && s.tokenCost > 0 ? (
                    <>
                      <span>·</span>
                      <span>{s.tokenCost.toLocaleString()} tokens</span>
                    </>
                  ) : null}
                  {prev ? (
                    <>
                      <span>·</span>
                      <span>resubmission</span>
                    </>
                  ) : null}
                </div>
                {s.grade ? <GradeBadge grade={s.grade} /> : null}
              </header>
              <details className="mb-3 rounded border bg-muted/30 p-3">
                <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
                  Your submission
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{s.content}</pre>
              </details>
              {prev ? (
                <details className="mb-3 rounded border bg-muted/30 p-3">
                  <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
                    See what changed since previous submission
                  </summary>
                  <div className="mt-3">
                    <ChangedView
                      type={submissionType}
                      oldContent={prev.content}
                      newContent={s.content}
                    />
                  </div>
                </details>
              ) : null}
              {s.feedbackMd ? (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Feedback</div>
                  <Markdown>{s.feedbackMd}</Markdown>
                </div>
              ) : s.grade === "pending" ? (
                <p className="text-xs text-muted-foreground">
                  Grading didn't finish. Retry from the form on the Task tab.
                </p>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function LessonTab({
  taskId,
  lesson,
  quizQuestions,
  initialQuizAttempts,
  apiKeyMissing,
}: {
  taskId: number;
  lesson: Lesson | null;
  quizQuestions: QuizQuestion[];
  initialQuizAttempts: Record<number, InitialAttempt>;
  apiKeyMissing: boolean;
}) {
  if (apiKeyMissing && !lesson) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm shadow-sm">
        <p className="text-muted-foreground">
          Lesson generation needs an Anthropic key. Add it in{" "}
          <Link href="/settings" className="text-primary hover:underline">
            /settings
          </Link>
          , then refresh this page.
        </p>
      </div>
    );
  }
  if (!lesson) {
    return <LessonAutoGenerator taskId={taskId} />;
  }

  const conceptChunks = splitConceptSections(lesson.conceptsMd);
  const inlineQuestions: InlineQuestion[] = quizQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanationMd: q.explanationMd,
  }));
  const initialFor = (qid: number): InlineInitialAttempt | undefined => {
    const a = initialQuizAttempts[qid];
    return a ? { selectedIndex: a.selectedIndex, correct: a.correct } : undefined;
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Lesson</h2>
        <div className="flex items-center gap-2">
          <RegenerateLessonSimplerButton taskId={taskId} />
          <RegenerateLessonButton taskId={taskId} />
        </div>
      </header>

      {/* Concept 1 → Question 1 → Concept 2 → Question 2 → Concept 3 → Code → Diagram.
          Splitting the quiz into two moments keeps each question close to the
          concept it tests. */}
      {conceptChunks[0] ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <Markdown>{conceptChunks[0]}</Markdown>
        </div>
      ) : null}
      {inlineQuestions[0] ? (
        <QuizQuestionInline
          taskId={taskId}
          index={0}
          question={inlineQuestions[0]}
          initialAttempt={initialFor(inlineQuestions[0].id)}
        />
      ) : null}

      {conceptChunks[1] ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <Markdown>{conceptChunks[1]}</Markdown>
        </div>
      ) : null}
      {inlineQuestions[1] ? (
        <QuizQuestionInline
          taskId={taskId}
          index={1}
          question={inlineQuestions[1]}
          initialAttempt={initialFor(inlineQuestions[1].id)}
        />
      ) : null}

      {conceptChunks[2] ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <Markdown>{conceptChunks[2]}</Markdown>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Worked example
        </h3>
        <Markdown>{lesson.workedExampleMd}</Markdown>
      </div>

      {lesson.diagramMermaid ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Diagram
          </h3>
          <MermaidDiagram source={lesson.diagramMermaid} />
        </div>
      ) : null}
    </section>
  );
}

/** Split concepts_md by `### ` headings. Returns one chunk per heading; falls
 * back to a single chunk if no headings are present. */
function splitConceptSections(md: string): string[] {
  const lines = md.split("\n");
  const sections: string[] = [];
  let cur: string[] = [];
  for (const line of lines) {
    if (/^###\s/.test(line)) {
      if (cur.length > 0 && cur.join("").trim()) sections.push(cur.join("\n").trim());
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length > 0 && cur.join("").trim()) sections.push(cur.join("\n").trim());
  return sections.length > 0 ? sections : [md];
}

function initialQuizAttemptsFor(
  quiz: ReturnType<typeof loadLessonQuiz>,
): Record<number, InitialAttempt> {
  const out: Record<number, InitialAttempt> = {};
  if (!quiz) return out;
  for (const [qid, a] of quiz.latestByQuestion) {
    out[qid] = { selectedIndex: a.selectedIndex, correct: a.correct };
  }
  return out;
}

/** Mounts the auto-generator silently while the user is on a different tab. */
function BackgroundLessonGenerator({ taskId }: { taskId: number }) {
  return (
    <div className="sr-only" aria-hidden>
      <LessonAutoGenerator taskId={taskId} />
    </div>
  );
}

function SideNav({
  weekTasks,
  currentId,
  week,
  prev,
  next,
}: {
  weekTasks: Array<{ id: number; day: number; title: string; status: Status }>;
  currentId: number;
  week: number;
  prev: { id: number; day: number; title: string } | null;
  next: { id: number; day: number; title: string } | null;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {week === 0 ? "AI track" : `Week ${week}`}
        </div>
        <ul className="space-y-0.5">
          {weekTasks.map((t) => {
            const active = t.id === currentId;
            return (
              <li key={t.id}>
                <Link
                  href={`/task/${t.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <StatusDot status={t.status} />
                  <span className="w-10 shrink-0 text-[11px] uppercase">D{t.day}</span>
                  <span className="truncate">{t.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex gap-2">
        {prev ? (
          <Link
            href={`/task/${prev.id}`}
            className="flex-1 rounded-md border bg-card px-3 py-2 text-xs hover:bg-muted/50"
          >
            <div className="text-muted-foreground">
              ← {week === 0 ? `#${prev.day}` : `Day ${prev.day}`}
            </div>
            <div className="truncate font-medium">{prev.title}</div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/task/${next.id}`}
            className="flex-1 rounded-md border bg-card px-3 py-2 text-right text-xs hover:bg-muted/50"
          >
            <div className="text-muted-foreground">
              {week === 0 ? `#${next.day}` : `Day ${next.day}`} →
            </div>
            <div className="truncate font-medium">{next.title}</div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
