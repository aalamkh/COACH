import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, asc, desc, eq, inArray, max } from "drizzle-orm";
import { db } from "@/db/client";
import {
  lessons,
  notes,
  progress,
  quizAttempts,
  quizQuestions,
  retros,
  submissions,
  tasks,
  type RetroAnswers,
} from "@/db/schema";
import { MissingApiKeyError } from "./anthropic";
import { MODEL_IDS, readSettings } from "./env";

// ───────── week status ─────────

export interface WeekStatus {
  week: number;
  /** Highest day-number task in the week. */
  lastDay: number;
  /** Whether the highest-day task is currently `passed`. */
  complete: boolean;
  /** When the last-day task was passed. Null when not passed yet. */
  lastPassedAt: Date | null;
  /** True if a retro row already exists for this week. */
  hasRetro: boolean;
}

export function loadWeekStatuses(): WeekStatus[] {
  const allRetros = db.select({ week: retros.week }).from(retros).all();
  const retroWeeks = new Set(allRetros.map((r) => r.week));

  // Last-day task per week (highest day).
  const lastTasks = db
    .select({
      week: tasks.week,
      day: tasks.day,
      taskId: tasks.id,
      status: progress.status,
      passedAt: progress.passedAt,
    })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .all();

  const byWeek = new Map<number, { day: number; status: string; passedAt: Date | null }>();
  for (const r of lastTasks) {
    const cur = byWeek.get(r.week);
    if (!cur || r.day > cur.day) {
      byWeek.set(r.week, { day: r.day, status: r.status, passedAt: r.passedAt });
    }
  }

  const out: WeekStatus[] = [];
  for (const [week, info] of byWeek) {
    if (week <= 0) continue; // exclude AI track (week=0)
    out.push({
      week,
      lastDay: info.day,
      complete: info.status === "passed",
      lastPassedAt: info.passedAt,
      hasRetro: retroWeeks.has(week),
    });
  }
  out.sort((a, b) => a.week - b.week);
  return out;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type RetroBanner =
  | { kind: "ready"; week: number }
  | { kind: "overdue"; week: number; daysOverdue: number };

/** Banners to render on the dashboard. */
export function retroBanners(): RetroBanner[] {
  const statuses = loadWeekStatuses();
  const now = Date.now();
  const out: RetroBanner[] = [];
  for (const s of statuses) {
    if (!s.complete) continue;
    if (s.hasRetro) continue;
    const finishedAt = s.lastPassedAt?.getTime() ?? now;
    const days = Math.floor((now - finishedAt) / DAY_MS);
    if (days >= 3) {
      out.push({ kind: "overdue", week: s.week, daysOverdue: days });
    } else {
      out.push({ kind: "ready", week: s.week });
    }
  }
  return out;
}

// ───────── data builders ─────────

export interface PassedTitle {
  day: number;
  title: string;
}

export function passedTitlesForWeek(week: number): PassedTitle[] {
  return db
    .select({ day: tasks.day, title: tasks.title })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(and(eq(tasks.week, week), eq(progress.status, "passed")))
    .orderBy(asc(tasks.day))
    .all();
}

export interface WeekSummary {
  week: number;
  tasks: Array<{
    day: number;
    title: string;
    grade: string | null;
    feedbackExcerpt: string | null;
    submissionType: string;
  }>;
  notes: Array<{ at: string; body: string; taskTitle: string | null }>;
  quiz: Array<{ taskTitle: string; correct: number; total: number }>;
}

function clamp(text: string, n: number): string {
  if (!text) return "";
  return text.length > n ? text.slice(0, n).trim() + "…" : text;
}

export function buildWeekSummary(week: number): WeekSummary {
  // Most recent submission per task in this week.
  const subs = db
    .select({
      taskId: submissions.taskId,
      taskDay: tasks.day,
      taskTitle: tasks.title,
      submissionType: tasks.submissionType,
      grade: submissions.grade,
      feedbackMd: submissions.feedbackMd,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .innerJoin(tasks, eq(tasks.id, submissions.taskId))
    .where(eq(tasks.week, week))
    .orderBy(desc(submissions.submittedAt))
    .all();

  const taskMap = new Map<
    number,
    {
      day: number;
      title: string;
      grade: string | null;
      feedbackExcerpt: string | null;
      submissionType: string;
    }
  >();
  for (const s of subs) {
    if (taskMap.has(s.taskId)) continue;
    taskMap.set(s.taskId, {
      day: s.taskDay,
      title: s.taskTitle,
      grade: s.grade,
      feedbackExcerpt: s.feedbackMd ? clamp(s.feedbackMd, 400) : null,
      submissionType: s.submissionType,
    });
  }

  // Notes for the week (linked to a task in this week, or unlinked notes
  // saved during the week's date range).
  const weekTaskIds = Array.from(taskMap.keys());
  const linkedNotes =
    weekTaskIds.length > 0
      ? db
          .select({
            createdAt: notes.createdAt,
            body: notes.bodyMd,
            taskTitle: tasks.title,
          })
          .from(notes)
          .innerJoin(tasks, eq(tasks.id, notes.taskId))
          .where(inArray(notes.taskId, weekTaskIds))
          .orderBy(desc(notes.createdAt))
          .all()
      : [];

  // Quiz: latest attempt per question for lessons of this week.
  const lessonsThisWeek = db
    .select({ id: lessons.id, taskId: lessons.taskId, taskTitle: tasks.title })
    .from(lessons)
    .innerJoin(tasks, eq(tasks.id, lessons.taskId))
    .where(eq(tasks.week, week))
    .all();

  const quizSummary: WeekSummary["quiz"] = [];
  for (const l of lessonsThisWeek) {
    const qs = db
      .select({ id: quizQuestions.id })
      .from(quizQuestions)
      .where(eq(quizQuestions.lessonId, l.id))
      .all();
    if (qs.length === 0) continue;
    const ids = qs.map((q) => q.id);
    const attempts = db
      .select({
        questionId: quizAttempts.questionId,
        correct: quizAttempts.correct,
        answeredAt: quizAttempts.answeredAt,
      })
      .from(quizAttempts)
      .where(inArray(quizAttempts.questionId, ids))
      .all();
    if (attempts.length === 0) continue;
    const latest = new Map<number, boolean>();
    const latestTime = new Map<number, number>();
    for (const a of attempts) {
      const t = a.answeredAt.getTime();
      const cur = latestTime.get(a.questionId) ?? -1;
      if (t > cur) {
        latest.set(a.questionId, a.correct);
        latestTime.set(a.questionId, t);
      }
    }
    const correct = Array.from(latest.values()).filter(Boolean).length;
    quizSummary.push({ taskTitle: l.taskTitle, correct, total: ids.length });
  }

  return {
    week,
    tasks: Array.from(taskMap.values()).sort((a, b) => a.day - b.day),
    notes: linkedNotes.map((n) => ({
      at: n.createdAt.toISOString(),
      body: clamp(n.body, 500),
      taskTitle: n.taskTitle,
    })),
    quiz: quizSummary,
  };
}

// silence unused import
void max;

// ───────── Anthropic ─────────

const SYSTEM_PROMPT = `You are reviewing a full week of a mid-level developer's work on a 14-week plan to build a full-stack + AI product. You have their self-retro answers, every task submission and grade, every note they wrote, and their quiz performance. Give an honest assessment (3-5 paragraphs, markdown): are they on track, what pattern do you see across the week, what is the single most important calibration for next week. Be specific — cite actual task titles, actual feedback you gave, actual notes they wrote. No cheerleading. If they're drifting, say it. End with ONE concrete instruction for Week N+1 Day 1.`;

function userMessage(week: number, answers: RetroAnswers, summary: WeekSummary): string {
  const tasksBlock =
    summary.tasks.length === 0
      ? "(no submissions this week)"
      : summary.tasks
          .map(
            (t) =>
              `- W${week}D${t.day} "${t.title}" — type: ${t.submissionType} — grade: ${t.grade ?? "pending"}${
                t.feedbackExcerpt ? `\n  feedback excerpt: ${t.feedbackExcerpt}` : ""
              }`,
          )
          .join("\n");

  const notesBlock =
    summary.notes.length === 0
      ? "(no notes saved this week)"
      : summary.notes
          .map(
            (n) =>
              `- ${n.at}${n.taskTitle ? ` (re ${n.taskTitle})` : ""}: ${n.body}`,
          )
          .join("\n");

  const quizBlock =
    summary.quiz.length === 0
      ? "(no quizzes attempted this week)"
      : summary.quiz.map((q) => `- ${q.taskTitle}: ${q.correct}/${q.total}`).join("\n");

  return `RETRO — WEEK ${week}

Self-retro answers:
1. What I shipped:
${answers.shipped}

2. What blocked me:
${answers.blocked}

3. What I learned that I didn't know last Sunday:
${answers.learned}

4. What surprised me:
${answers.surprised}

5. What I'm changing next week:
${answers.changing}

WEEK ${week} DATA

Tasks attempted this week (latest submission per task):
${tasksBlock}

Notes I wrote this week:
${notesBlock}

Quiz performance (latest attempt per question, per lesson):
${quizBlock}`;
}

export interface RetroAssessmentResult {
  assessmentMd: string;
  tokenCost: number;
  model: string;
}

export async function generateRetroAssessment(params: {
  week: number;
  answers: RetroAnswers;
  summary: WeekSummary;
}): Promise<RetroAssessmentResult> {
  const { apiKey, gradingModel } = await readSettings();
  if (!apiKey) throw new MissingApiKeyError();

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL_IDS[gradingModel],
    max_tokens: 2500,
    temperature: 0.4,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage(params.week, params.answers, params.summary) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic response missing text block.");
  }

  const tokenCost =
    (response.usage.input_tokens ?? 0) +
    (response.usage.output_tokens ?? 0) +
    (response.usage.cache_creation_input_tokens ?? 0) +
    (response.usage.cache_read_input_tokens ?? 0);

  return {
    assessmentMd: textBlock.text,
    tokenCost,
    model: MODEL_IDS[gradingModel],
  };
}
