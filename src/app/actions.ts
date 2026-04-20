"use server";

import { desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import {
  briefings,
  lessons,
  notes,
  progress,
  quizAttempts,
  quizQuestions,
  retros,
  statusLines,
  submissions,
  tasks,
  unblockSuggestions,
} from "@/db/schema";
import {
  MissingApiKeyError,
  gradeSubmission,
  type PreviousSubmissionContext,
} from "@/lib/anthropic";
import { GithubFetchError, fetchCommit, parseCommitUrl } from "@/lib/github";
import { generateLesson, SIMPLER_INSTRUCTION } from "@/lib/lesson";
import { buildWeekSummary, generateRetroAssessment } from "@/lib/retro";
import { generateBriefing, todayLocalDate } from "@/lib/briefing";
import { generateStatusLine, todayLocalDate as todayStatusDate } from "@/lib/status";
import { generateUnblockSuggestion } from "@/lib/unblock";
import { generateNextAction } from "@/lib/next-action";
import { UrlFetchError, fetchUrlText } from "@/lib/url-fetch";
import { markPassedAndUnlockNext, touchStarted } from "@/lib/progress";
import {
  modelSchema,
  updateSettingsRow,
  STUCK_HOURS_MAX,
  STUCK_HOURS_MIN,
} from "@/lib/env";

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

// ───────── Auth (password gate) ─────────

const COACH_AUTH_COOKIE = "coach_auth";
const COACH_AUTH_VALUE = "ok";
/** Set COACH_PASSWORD in Netlify env. Defaults to "12345" for local dev. */
function coachPassword(): string {
  return process.env.COACH_PASSWORD ?? "12345";
}

const loginSchema = z.object({
  password: z.string().min(1).max(200),
  next: z.string().max(500).optional(),
});

export async function login(formData: FormData): Promise<void> {
  const parsed = loginSchema.safeParse({
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) redirect("/login?error=invalid");

  if (parsed.data.password !== coachPassword()) {
    redirect("/login?error=wrong");
  }

  const jar = await cookies();
  jar.set(COACH_AUTH_COOKIE, COACH_AUTH_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const nextPath =
    parsed.data.next && parsed.data.next.startsWith("/") && !parsed.data.next.startsWith("//")
      ? parsed.data.next
      : "/";
  redirect(nextPath);
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COACH_AUTH_COOKIE);
  redirect("/login");
}

// ───────── Submit (any type) ─────────

const baseSubmitSchema = z.object({
  taskId: z.coerce.number().int().positive(),
});

const textSchema = z.object({
  content: z.string().trim().min(10, "Answer must be at least 10 characters.").max(20_000),
});

const urlContentSchema = z.object({
  content: z.string().trim().url("Must be a valid URL.").max(2000),
});

const githubContentSchema = z.object({
  content: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => parseCommitUrl(v) !== null, "Must be a GitHub commit URL: https://github.com/owner/repo/commit/<sha>"),
});

export async function submitTask(
  formData: FormData,
): Promise<ActionResult<{ submissionId: number; grade: string }>> {
  const baseParse = baseSubmitSchema.safeParse({ taskId: formData.get("taskId") });
  if (!baseParse.success) {
    return { ok: false, error: "Invalid task id." };
  }
  const { taskId } = baseParse.data;

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { ok: false, error: "Task not found." };

  const rawContent = formData.get("content");

  let content: string;
  if (task.submissionType === "text_answer") {
    const parsed = textSchema.safeParse({ content: rawContent });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    content = parsed.data.content;
  } else if (task.submissionType === "url") {
    const parsed = urlContentSchema.safeParse({ content: rawContent });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    content = parsed.data.content;
  } else {
    const parsed = githubContentSchema.safeParse({ content: rawContent });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    content = parsed.data.content;
  }

  // Fetch external context BEFORE any DB write or Anthropic call.
  // Inline error returned to client; no submissions row, no grading call consumed.
  let extraContext: string | null = null;
  if (task.submissionType === "github_commit") {
    try {
      const commit = await fetchCommit(content);
      extraContext = `Commit message: ${commit.message}\n\nDiff (${commit.filesChanged} file${commit.filesChanged === 1 ? "" : "s"}${commit.truncated ? ", truncated to 8000 chars" : ""}):\n${commit.diff}`;
    } catch (e) {
      if (e instanceof GithubFetchError) return { ok: false, error: e.message };
      throw e;
    }
  } else if (task.submissionType === "url") {
    try {
      const page = await fetchUrlText(content);
      extraContext = `Page content from ${page.url}:\n${page.text}`;
    } catch (e) {
      if (e instanceof UrlFetchError) return { ok: false, error: e.message };
      throw e;
    }
  }

  // Resubmission detection: look up the most recent prior submission for this task.
  const priorRow = await db
    .select({
      id: submissions.id,
      content: submissions.content,
      feedbackMd: submissions.feedbackMd,
      grade: submissions.grade,
      specificIssues: submissions.specificIssues,
    })
    .from(submissions)
    .where(eq(submissions.taskId, taskId))
    .orderBy(desc(submissions.submittedAt))
    .limit(1)
    .get();

  let previousContext: PreviousSubmissionContext | null = null;
  if (priorRow && priorRow.grade && priorRow.grade !== "pending") {
    let oldDiffBlock: string | null = null;
    if (task.submissionType === "github_commit") {
      try {
        const oldCommit = await fetchCommit(priorRow.content);
        oldDiffBlock = `Commit message: ${oldCommit.message}\n\nDiff (${oldCommit.filesChanged} file${oldCommit.filesChanged === 1 ? "" : "s"}${oldCommit.truncated ? ", truncated" : ""}):\n${oldCommit.diff}`;
      } catch {
        oldDiffBlock = "(previous commit could not be fetched)";
      }
    }
    previousContext = {
      grade: priorRow.grade,
      feedbackMd: priorRow.feedbackMd ?? "(no feedback recorded)",
      specificIssues: priorRow.specificIssues ?? [],
      content: priorRow.content,
      oldDiffBlock,
    };
  }

  const inserted = await db
    .insert(submissions)
    .values({
      taskId,
      content,
      grade: "pending",
      previousSubmissionId: priorRow?.id ?? null,
    })
    .returning({ id: submissions.id })
    .get();

  await touchStarted(taskId);

  try {
    const result = await gradeSubmission({
      task,
      submissionContent: content,
      extraContext,
      previousSubmission: previousContext,
    });
    const feedback =
      result.specific_issues.length > 0
        ? `${result.feedback_md}\n\n**Specific issues:**\n\n${result.specific_issues
            .map((i) => `- ${i}`)
            .join("\n")}`
        : result.feedback_md;

    await db
      .update(submissions)
      .set({
        grade: result.grade,
        feedbackMd: feedback,
        specificIssues: result.specific_issues,
        tokenCost: result.tokenCost,
        model: result.model,
      })
      .where(eq(submissions.id, inserted.id))
      .run();

    if (result.grade === "pass") {
      await markPassedAndUnlockNext(taskId);
    }

    revalidatePath(`/task/${taskId}`);
    revalidatePath("/plan");
    revalidatePath("/");

    return { ok: true, data: { submissionId: inserted.id, grade: result.grade } };
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Grader error: ${e.message}`
          : "Grader error.";
    return { ok: false, error: message };
  }
}

// ───────── Snooze ─────────

const snoozeSchema = z.object({
  taskId: z.coerce.number().int().positive(),
  days: z.coerce.number().int().min(1).max(30),
});

function midnightPlusDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function snoozeTask(formData: FormData): Promise<void> {
  const parsed = snoozeSchema.safeParse({
    taskId: formData.get("taskId"),
    days: formData.get("days"),
  });
  if (!parsed.success) return;

  const cur = await db
    .select()
    .from(progress)
    .where(eq(progress.taskId, parsed.data.taskId))
    .get();
  if (!cur || cur.status === "passed") return;

  const until = midnightPlusDays(parsed.data.days);
  await db
    .update(progress)
    .set({
      status: "in_progress",
      snoozedUntil: until,
      startedAt: cur.startedAt ?? new Date(),
    })
    .where(eq(progress.taskId, parsed.data.taskId))
    .run();

  revalidatePath(`/task/${parsed.data.taskId}`);
  revalidatePath("/plan");
  revalidatePath("/");
}

export async function unsnoozeTask(formData: FormData): Promise<void> {
  const parsed = z
    .object({ taskId: z.coerce.number().int().positive() })
    .safeParse({ taskId: formData.get("taskId") });
  if (!parsed.success) return;

  await db
    .update(progress)
    .set({ snoozedUntil: null })
    .where(eq(progress.taskId, parsed.data.taskId))
    .run();

  revalidatePath(`/task/${parsed.data.taskId}`);
  revalidatePath("/plan");
  revalidatePath("/");
}

// ───────── Manual override ─────────

const overrideSchema = z.object({
  taskId: z.coerce.number().int().positive(),
});

export async function markPassedOverride(formData: FormData): Promise<void> {
  const parsed = overrideSchema.safeParse({ taskId: formData.get("taskId") });
  if (!parsed.success) return;
  const { taskId } = parsed.data;

  await db
    .insert(submissions)
    .values({
      taskId,
      content: "(manual override)",
      grade: "manual",
      feedbackMd: "Marked passed manually without grading.",
    })
    .run();

  await markPassedAndUnlockNext(taskId);
  revalidatePath(`/task/${taskId}`);
  revalidatePath("/plan");
  revalidatePath("/");
}

// ───────── Settings ─────────

const settingsSchema = z.object({
  apiKey: z.string().trim().max(200),
  githubUsername: z.string().trim().min(1).max(64).default("aalamkh"),
  lessonModel: modelSchema,
  gradingModel: modelSchema,
});

// ───────── Lessons ─────────

const lessonTaskSchema = z.object({ taskId: z.coerce.number().int().positive() });

export async function generateLessonForTask(
  formData: FormData,
): Promise<ActionResult<{ lessonId: number }>> {
  const parsed = lessonTaskSchema.safeParse({ taskId: formData.get("taskId") });
  if (!parsed.success) return { ok: false, error: "Invalid task id." };
  const { taskId } = parsed.data;

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { ok: false, error: "Task not found." };

  // Idempotent: if a lesson already exists, return it without spending tokens.
  const existing = await db.select().from(lessons).where(eq(lessons.taskId, taskId)).get();
  if (existing) {
    return { ok: true, data: { lessonId: existing.id } };
  }

  try {
    const result = await generateLesson(task);
    const inserted = await db
      .insert(lessons)
      .values({
        taskId,
        conceptsMd: result.concepts_md,
        workedExampleMd: result.worked_example_md,
        diagramMermaid: result.diagram_mermaid,
        tokenCost: result.tokenCost,
        model: result.model,
      })
      .returning({ id: lessons.id })
      .get();

    await db
      .insert(quizQuestions)
      .values(
        result.questions.map((q) => ({
          lessonId: inserted.id,
          question: q.question,
          options: q.options,
          correctIndex: q.correct_index,
          explanationMd: q.explanation_md,
        })),
      )
      .run();

    revalidatePath(`/task/${taskId}`);
    return { ok: true, data: { lessonId: inserted.id } };
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Lesson generation error: ${e.message}`
          : "Lesson generation error.";
    return { ok: false, error: message };
  }
}

export async function regenerateLessonForTask(formData: FormData): Promise<void> {
  const parsed = lessonTaskSchema.safeParse({ taskId: formData.get("taskId") });
  if (!parsed.success) return;
  await db.delete(lessons).where(eq(lessons.taskId, parsed.data.taskId)).run();
  revalidatePath(`/task/${parsed.data.taskId}`);
}

/** Single-click "Teach this again, simpler". Wipes the cached lesson and
 * generates a new one with an extra instruction appended to the system prompt
 * that asks Claude for a different analogy and shorter prose. */
export async function regenerateLessonSimplerForTask(
  formData: FormData,
): Promise<ActionResult<{ lessonId: number }>> {
  const parsed = lessonTaskSchema.safeParse({ taskId: formData.get("taskId") });
  if (!parsed.success) return { ok: false, error: "Invalid task id." };
  const { taskId } = parsed.data;

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { ok: false, error: "Task not found." };

  await db.delete(lessons).where(eq(lessons.taskId, taskId)).run();

  try {
    const result = await generateLesson(task, SIMPLER_INSTRUCTION);
    const inserted = await db
      .insert(lessons)
      .values({
        taskId,
        conceptsMd: result.concepts_md,
        workedExampleMd: result.worked_example_md,
        diagramMermaid: result.diagram_mermaid,
        tokenCost: result.tokenCost,
        model: result.model,
      })
      .returning({ id: lessons.id })
      .get();

    await db
      .insert(quizQuestions)
      .values(
        result.questions.map((q) => ({
          lessonId: inserted.id,
          question: q.question,
          options: q.options,
          correctIndex: q.correct_index,
          explanationMd: q.explanation_md,
        })),
      )
      .run();

    revalidatePath(`/task/${taskId}`);
    return { ok: true, data: { lessonId: inserted.id } };
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Lesson regeneration error: ${e.message}`
          : "Lesson regeneration error.";
    return { ok: false, error: message };
  }
}

// ───────── Notes ─────────

const noteSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty.").max(10_000),
  taskId: z.coerce.number().int().positive().optional(),
});

export async function addNote(formData: FormData): Promise<ActionResult<{ id: number }>> {
  const rawTaskId = formData.get("taskId");
  const parsed = noteSchema.safeParse({
    body: formData.get("body"),
    taskId: rawTaskId && rawTaskId !== "" ? rawTaskId : undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }
  const inserted = await db
    .insert(notes)
    .values({ bodyMd: parsed.data.body, taskId: parsed.data.taskId ?? null })
    .returning({ id: notes.id })
    .get();

  revalidatePath("/notes");
  revalidatePath("/");
  if (parsed.data.taskId) revalidatePath(`/task/${parsed.data.taskId}`);
  return { ok: true, data: { id: inserted.id } };
}

const deleteNoteSchema = z.object({ id: z.coerce.number().int().positive() });

export async function deleteNote(formData: FormData): Promise<void> {
  const parsed = deleteNoteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  await db.delete(notes).where(eq(notes.id, parsed.data.id)).run();
  revalidatePath("/notes");
  revalidatePath("/");
}

// ───────── Quiz attempts ─────────

const quizAttemptsPayloadSchema = z.object({
  taskId: z.number().int().positive(),
  answers: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        selectedIndex: z.number().int().min(0).max(2),
      }),
    )
    .min(1)
    .max(20),
});

export async function submitQuizAttempts(payload: {
  taskId: number;
  answers: Array<{ questionId: number; selectedIndex: number }>;
}): Promise<ActionResult<{ correct: number; total: number }>> {
  const parsed = quizAttemptsPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid quiz payload." };
  }

  const ids = parsed.data.answers.map((a) => a.questionId);
  const questions = await db
    .select({ id: quizQuestions.id, correctIndex: quizQuestions.correctIndex })
    .from(quizQuestions)
    .where(inArray(quizQuestions.id, ids))
    .all();
  const correctIndexById = new Map<number, number>();
  for (const q of questions) correctIndexById.set(q.id, q.correctIndex);

  // All submitted question ids must belong to known questions; otherwise refuse.
  if (parsed.data.answers.some((a) => !correctIndexById.has(a.questionId))) {
    return { ok: false, error: "Unknown question id in payload." };
  }

  const now = new Date();
  let correctCount = 0;
  const rows = parsed.data.answers.map((a) => {
    const correct = correctIndexById.get(a.questionId) === a.selectedIndex;
    if (correct) correctCount += 1;
    return {
      questionId: a.questionId,
      selectedIndex: a.selectedIndex,
      correct,
      answeredAt: now,
    };
  });
  await db.insert(quizAttempts).values(rows).run();

  revalidatePath(`/task/${parsed.data.taskId}`);
  return { ok: true, data: { correct: correctCount, total: parsed.data.answers.length } };
}

// ───────── Retros ─────────

const retroFormSchema = z.object({
  week: z.coerce.number().int().min(1).max(14),
  shipped: z.string().trim().min(1).max(5000),
  blocked: z.string().trim().min(1).max(5000),
  learned: z.string().trim().min(1).max(5000),
  surprised: z.string().trim().min(1).max(5000),
  changing: z.string().trim().min(1).max(5000),
});

export async function submitRetro(formData: FormData): Promise<ActionResult<{ week: number }>> {
  const parsed = retroFormSchema.safeParse({
    week: formData.get("week"),
    shipped: formData.get("shipped"),
    blocked: formData.get("blocked"),
    learned: formData.get("learned"),
    surprised: formData.get("surprised"),
    changing: formData.get("changing"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid retro form." };
  }
  const { week, ...answers } = parsed.data;

  const existing = await db.select().from(retros).where(eq(retros.week, week)).get();
  if (existing) {
    await db
      .update(retros)
      .set({
        answersJson: answers,
        generatedAt: new Date(),
        claudeAssessmentMd: null,
        tokenCost: 0,
      })
      .where(eq(retros.week, week))
      .run();
  } else {
    await db.insert(retros).values({ week, answersJson: answers }).run();
  }

  try {
    const summary = await buildWeekSummary(week);
    const result = await generateRetroAssessment({ week, answers, summary });
    await db
      .update(retros)
      .set({
        claudeAssessmentMd: result.assessmentMd,
        tokenCost: result.tokenCost,
      })
      .where(eq(retros.week, week))
      .run();
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Retro assessment error: ${e.message}`
          : "Retro assessment error.";
    revalidatePath(`/retro/${week}`);
    revalidatePath("/retros");
    revalidatePath("/");
    return { ok: false, error: message };
  }

  revalidatePath(`/retro/${week}`);
  revalidatePath("/retros");
  revalidatePath("/");
  return { ok: true, data: { week } };
}

const regenerateRetroSchema = z.object({
  week: z.coerce.number().int().min(1).max(14),
});

export async function regenerateRetroAction(
  formData: FormData,
): Promise<ActionResult<{ week: number }>> {
  const parsed = regenerateRetroSchema.safeParse({ week: formData.get("week") });
  if (!parsed.success) return { ok: false, error: "Invalid week." };
  const { week } = parsed.data;

  const existing = await db.select().from(retros).where(eq(retros.week, week)).get();
  if (!existing) return { ok: false, error: "No retro to regenerate. Submit one first." };

  try {
    const summary = await buildWeekSummary(week);
    const result = await generateRetroAssessment({
      week,
      answers: existing.answersJson,
      summary,
    });
    await db
      .update(retros)
      .set({
        claudeAssessmentMd: result.assessmentMd,
        tokenCost: existing.tokenCost + result.tokenCost,
        generatedAt: new Date(),
      })
      .where(eq(retros.week, week))
      .run();
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Retro assessment error: ${e.message}`
          : "Retro assessment error.";
    return { ok: false, error: message };
  }

  revalidatePath(`/retro/${week}`);
  revalidatePath("/retros");
  return { ok: true, data: { week } };
}

// ───────── Unblock (stuck-detector) ─────────

const HOUR_MS = 60 * 60 * 1000;
const unblockTaskSchema = z.object({ taskId: z.coerce.number().int().positive() });

export async function requestUnblockSuggestion(
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const parsed = unblockTaskSchema.safeParse({ taskId: formData.get("taskId") });
  if (!parsed.success) return { ok: false, error: "Invalid task id." };
  const { taskId } = parsed.data;

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { ok: false, error: "Task not found." };

  const prog = await db.select().from(progress).where(eq(progress.taskId, taskId)).get();
  if (!prog || !prog.startedAt) return { ok: false, error: "Task hasn't been started." };

  const hours = Math.max(1, Math.floor((Date.now() - prog.startedAt.getTime()) / HOUR_MS));

  try {
    const result = await generateUnblockSuggestion({ task, hoursInProgress: hours });
    const inserted = await db
      .insert(unblockSuggestions)
      .values({
        taskId,
        suggestionMd: result.suggestionMd,
        tokenCost: result.tokenCost,
      })
      .returning({ id: unblockSuggestions.id })
      .get();
    revalidatePath(`/task/${taskId}`);
    return { ok: true, data: { id: inserted.id } };
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Unblock error: ${e.message}`
          : "Unblock error.";
    return { ok: false, error: message };
  }
}

const dismissSuggestionSchema = z.object({
  id: z.coerce.number().int().positive(),
  taskId: z.coerce.number().int().positive(),
});

export async function dismissUnblockSuggestion(formData: FormData): Promise<void> {
  const parsed = dismissSuggestionSchema.safeParse({
    id: formData.get("id"),
    taskId: formData.get("taskId"),
  });
  if (!parsed.success) return;
  await db
    .update(unblockSuggestions)
    .set({ dismissedAt: new Date() })
    .where(eq(unblockSuggestions.id, parsed.data.id))
    .run();
  revalidatePath(`/task/${parsed.data.taskId}`);
}

// ───────── Next physical action ─────────

const nextActionSchema = z.object({ taskId: z.coerce.number().int().positive() });

export async function getNextPhysicalAction(
  formData: FormData,
): Promise<ActionResult<{ text: string; model: string; tokenCost: number }>> {
  const parsed = nextActionSchema.safeParse({ taskId: formData.get("taskId") });
  if (!parsed.success) return { ok: false, error: "Invalid task id." };

  const task = await db.select().from(tasks).where(eq(tasks.id, parsed.data.taskId)).get();
  if (!task) return { ok: false, error: "Task not found." };

  try {
    const result = await generateNextAction(task);
    // Ephemeral — not persisted.
    return {
      ok: true,
      data: { text: result.text, model: result.model, tokenCost: result.tokenCost },
    };
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Next-action error: ${e.message}`
          : "Next-action error.";
    return { ok: false, error: message };
  }
}

// ───────── Status line ("where you are") ─────────

export async function generateStatusLineForToday(): Promise<
  ActionResult<{ id: number; created: boolean }>
> {
  const today = todayStatusDate();
  const existing = await db
    .select({ id: statusLines.id })
    .from(statusLines)
    .where(eq(statusLines.statusDate, today))
    .get();
  if (existing) return { ok: true, data: { id: existing.id, created: false } };

  try {
    const result = await generateStatusLine();
    const inserted = await db
      .insert(statusLines)
      .values({
        statusDate: today,
        messageMd: result.messageMd,
        paceLabel: result.paceLabel,
        tokenCost: result.tokenCost,
        model: result.model,
      })
      .returning({ id: statusLines.id })
      .get();
    revalidatePath("/");
    return { ok: true, data: { id: inserted.id, created: true } };
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Status-line error: ${e.message}`
          : "Status-line error.";
    return { ok: false, error: message };
  }
}

export async function regenerateStatusLineForToday(): Promise<ActionResult<{ id: number }>> {
  const today = todayStatusDate();
  await db.delete(statusLines).where(eq(statusLines.statusDate, today)).run();
  try {
    const result = await generateStatusLine();
    const inserted = await db
      .insert(statusLines)
      .values({
        statusDate: today,
        messageMd: result.messageMd,
        paceLabel: result.paceLabel,
        tokenCost: result.tokenCost,
        model: result.model,
      })
      .returning({ id: statusLines.id })
      .get();
    revalidatePath("/");
    return { ok: true, data: { id: inserted.id } };
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Status-line error: ${e.message}`
          : "Status-line error.";
    return { ok: false, error: message };
  }
}

// ───────── Daily briefing ─────────

export async function generateBriefingForToday(): Promise<
  ActionResult<{ briefingId: number; created: boolean }>
> {
  const today = todayLocalDate();
  const existing = await db
    .select({ id: briefings.id })
    .from(briefings)
    .where(eq(briefings.briefingDate, today))
    .get();
  if (existing) {
    return { ok: true, data: { briefingId: existing.id, created: false } };
  }

  try {
    const result = await generateBriefing();
    const inserted = await db
      .insert(briefings)
      .values({
        briefingDate: today,
        messageMd: result.messageMd,
        priorityTaskId: result.priorityTaskId,
        tokenCost: result.tokenCost,
        model: result.model,
      })
      .returning({ id: briefings.id })
      .get();
    revalidatePath("/");
    return { ok: true, data: { briefingId: inserted.id, created: true } };
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Briefing error: ${e.message}`
          : "Briefing error.";
    return { ok: false, error: message };
  }
}

export async function regenerateBriefingForToday(): Promise<
  ActionResult<{ briefingId: number }>
> {
  const today = todayLocalDate();
  await db.delete(briefings).where(eq(briefings.briefingDate, today)).run();
  try {
    const result = await generateBriefing();
    const inserted = await db
      .insert(briefings)
      .values({
        briefingDate: today,
        messageMd: result.messageMd,
        priorityTaskId: result.priorityTaskId,
        tokenCost: result.tokenCost,
        model: result.model,
      })
      .returning({ id: briefings.id })
      .get();
    revalidatePath("/");
    return { ok: true, data: { briefingId: inserted.id } };
  } catch (e) {
    const message =
      e instanceof MissingApiKeyError
        ? e.message
        : e instanceof Error
          ? `Briefing error: ${e.message}`
          : "Briefing error.";
    return { ok: false, error: message };
  }
}

// ───────── Export ─────────

import { estimateUsd } from "@/lib/pricing";

export interface ExportSummary {
  total_tasks: number;
  passed_count: number;
  weeks_completed: number;
  total_tokens: number;
  total_usd_estimated: number;
  earliest_activity: string | null;
  latest_activity: string | null;
}

export interface ExportPayload {
  version: number;
  exported_at: string;
  summary: ExportSummary;
  data: {
    tasks: unknown[];
    progress: unknown[];
    submissions: unknown[];
    lessons: unknown[];
    quiz_questions: unknown[];
    quiz_attempts: unknown[];
    notes: unknown[];
    retros: unknown[];
  };
}

function dateToIso(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  return v;
}

function rowsWithIsoDates<T extends Record<string, unknown>>(
  rows: T[],
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) out[k] = dateToIso(v);
    return out;
  });
}

export async function exportAllData(): Promise<
  ActionResult<{ filename: string; payload: ExportPayload }>
> {
  const [
    taskRows,
    progressRows,
    submissionRows,
    lessonRows,
    quizQuestionRows,
    quizAttemptRows,
    noteRows,
    retroRows,
  ] = await Promise.all([
    db.select().from(tasks).all(),
    db.select().from(progress).all(),
    db.select().from(submissions).all(),
    db.select().from(lessons).all(),
    db.select().from(quizQuestions).all(),
    db.select().from(quizAttempts).all(),
    db.select().from(notes).all(),
    db.select().from(retros).all(),
  ]);

  const totalTasks = taskRows.length;
  const passedCount = progressRows.filter((r) => r.status === "passed").length;

  // weeks_completed = number of weeks whose highest-day task is 'passed'
  const lastDayByWeek = new Map<number, { day: number; status: string }>();
  for (const t of taskRows) {
    const cur = lastDayByWeek.get(t.week);
    if (!cur || t.day > cur.day) {
      const p = progressRows.find((pr) => pr.taskId === t.id);
      lastDayByWeek.set(t.week, { day: t.day, status: p?.status ?? "locked" });
    }
  }
  const weeksCompleted = Array.from(lastDayByWeek.values()).filter(
    (v) => v.status === "passed",
  ).length;

  let totalTokens = 0;
  let totalUsd = 0;
  for (const s of submissionRows) {
    const t = s.tokenCost ?? 0;
    totalTokens += t;
    totalUsd += estimateUsd(t, s.model);
  }
  for (const l of lessonRows) {
    totalTokens += l.tokenCost ?? 0;
    totalUsd += estimateUsd(l.tokenCost ?? 0, l.model);
  }
  for (const r of retroRows) {
    totalTokens += r.tokenCost ?? 0;
    // retros store no model column (uses grading model at runtime). Tokens
    // count toward the total; USD is approximated below by reusing the
    // assumed grading rate via a conservative blend of opus pricing.
    totalUsd += estimateUsd(r.tokenCost ?? 0, "claude-opus-4-7");
  }

  // earliest/latest across timestamped activity
  const stamps: number[] = [];
  for (const s of submissionRows) stamps.push(s.submittedAt.getTime());
  for (const l of lessonRows) stamps.push(l.generatedAt.getTime());
  for (const n of noteRows) stamps.push(n.createdAt.getTime());
  for (const r of retroRows) stamps.push(r.generatedAt.getTime());
  for (const a of quizAttemptRows) stamps.push(a.answeredAt.getTime());
  for (const p of progressRows) {
    if (p.startedAt) stamps.push(p.startedAt.getTime());
    if (p.passedAt) stamps.push(p.passedAt.getTime());
  }
  const earliest = stamps.length ? new Date(Math.min(...stamps)).toISOString() : null;
  const latest = stamps.length ? new Date(Math.max(...stamps)).toISOString() : null;

  const summary: ExportSummary = {
    total_tasks: totalTasks,
    passed_count: passedCount,
    weeks_completed: weeksCompleted,
    total_tokens: totalTokens,
    total_usd_estimated: Number(totalUsd.toFixed(4)),
    earliest_activity: earliest,
    latest_activity: latest,
  };

  const payload: ExportPayload = {
    version: 1,
    exported_at: new Date().toISOString(),
    summary,
    data: {
      tasks: rowsWithIsoDates(taskRows),
      progress: rowsWithIsoDates(progressRows),
      submissions: rowsWithIsoDates(submissionRows),
      lessons: rowsWithIsoDates(lessonRows),
      quiz_questions: rowsWithIsoDates(quizQuestionRows),
      quiz_attempts: rowsWithIsoDates(quizAttemptRows),
      notes: rowsWithIsoDates(noteRows),
      retros: rowsWithIsoDates(retroRows),
    },
  };

  const today = new Date().toISOString().slice(0, 10);
  return { ok: true, data: { filename: `coach-export-${today}.json`, payload } };
}

// ───────── Settings: coaching ─────────

const coachingSettingsSchema = z.object({
  dailyBriefingEnabled: z.string().optional(), // checkbox: "on" or absent
  stuckDetectorEnabled: z.string().optional(),
  stuckHoursThreshold: z.coerce.number().int().min(STUCK_HOURS_MIN).max(STUCK_HOURS_MAX),
  nextActionModel: modelSchema,
});

export async function saveCoachingSettings(formData: FormData): Promise<void> {
  const parsed = coachingSettingsSchema.safeParse({
    dailyBriefingEnabled: formData.get("dailyBriefingEnabled") ?? undefined,
    stuckDetectorEnabled: formData.get("stuckDetectorEnabled") ?? undefined,
    stuckHoursThreshold: formData.get("stuckHoursThreshold"),
    nextActionModel: formData.get("nextActionModel"),
  });
  if (!parsed.success) return;

  await updateSettingsRow({
    dailyBriefingEnabled: parsed.data.dailyBriefingEnabled === "on",
    stuckDetectorEnabled: parsed.data.stuckDetectorEnabled === "on",
    stuckHoursThreshold: parsed.data.stuckHoursThreshold,
    nextActionModel: parsed.data.nextActionModel,
  });
  revalidatePath("/settings");
  revalidatePath("/");
}

// ───────── Settings ─────────

export async function saveSettings(formData: FormData): Promise<void> {
  const parsed = settingsSchema.safeParse({
    apiKey: formData.get("apiKey"),
    githubUsername: formData.get("githubUsername"),
    lessonModel: formData.get("lessonModel"),
    gradingModel: formData.get("gradingModel"),
  });
  if (!parsed.success) return;

  await updateSettingsRow({
    githubUsername: parsed.data.githubUsername,
    lessonModel: parsed.data.lessonModel,
    gradingModel: parsed.data.gradingModel,
    // Only overwrite the API key if the user supplied a non-empty value.
    anthropicApiKey: parsed.data.apiKey ? parsed.data.apiKey : undefined,
  });
  revalidatePath("/settings");
}
