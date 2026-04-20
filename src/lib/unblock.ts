import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { notes, submissions, tasks, type Task } from "@/db/schema";
import { generateText, MissingApiKeyError } from "./gemini";
import { readSettings } from "./env";

export interface UnblockResult {
  suggestionMd: string;
  tokenCost: number;
  model: string;
}

const SYSTEM_PROMPT_TEMPLATE = (hours: number, taskId: number) =>
  `The developer has been working on this task for ${hours} hours without submitting. Read the task description, success criteria, any notes they wrote with task_id=${taskId}, and any draft submission content if present. Name the 1-3 most likely specific blockers. For each, give a concrete unblock action. No generic advice ("break it into smaller steps"). If a note of theirs contradicts progress on this task, flag it directly. If you cannot guess the blocker from available info, say so and suggest exactly one clarifying question they should answer to get better help.`;

function clamp(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

function userMessage(task: Task, hours: number, notesForTask: string[], lastSubmissionContent: string | null): string {
  const lines: string[] = [];
  lines.push(`Task title: ${task.title}`);
  lines.push(`Week ${task.week}, Day ${task.day} · submission_type: ${task.submissionType}`);
  lines.push(`Time in progress: ${hours} hours`);
  lines.push("");
  lines.push("Task description (markdown):");
  lines.push(task.descriptionMd);
  lines.push("");
  lines.push("Success criteria (markdown):");
  lines.push(task.successCriteriaMd);
  lines.push("");
  lines.push("Notes the developer wrote attached to this task (most recent first):");
  if (notesForTask.length === 0) lines.push("  (none)");
  else for (const n of notesForTask) lines.push(`  - ${n}`);
  lines.push("");
  if (lastSubmissionContent) {
    lines.push("Most recent submission content (their last attempt — may be a draft, may have been graded already):");
    lines.push(lastSubmissionContent);
  } else {
    lines.push("Most recent submission content: (none — they have not submitted anything yet)");
  }
  return lines.join("\n");
}

export async function generateUnblockSuggestion(params: { task: Task; hoursInProgress: number }): Promise<UnblockResult> {
  const { apiKey, gradingModel } = await readSettings();
  if (!apiKey) throw new MissingApiKeyError();

  const taskNotes = await db
    .select({ body: notes.bodyMd, createdAt: notes.createdAt })
    .from(notes)
    .where(eq(notes.taskId, params.task.id))
    .orderBy(desc(notes.createdAt))
    .all();
  const noteStrings = taskNotes.map((n) => `${n.createdAt.toISOString()}: ${clamp(n.body, 600)}`);

  const lastSub = await db
    .select({ content: submissions.content })
    .from(submissions)
    .where(eq(submissions.taskId, params.task.id))
    .orderBy(desc(submissions.submittedAt))
    .limit(1)
    .get();
  const lastSubmissionContent = lastSub?.content ?? null;

  const result = await generateText({
    systemPrompt: SYSTEM_PROMPT_TEMPLATE(params.hoursInProgress, params.task.id),
    userPrompt: userMessage(
      params.task,
      params.hoursInProgress,
      noteStrings,
      lastSubmissionContent ? clamp(lastSubmissionContent, 4000) : null,
    ),
    model: gradingModel,
    temperature: 0.4,
    maxOutputTokens: 800,
  });

  return {
    suggestionMd: result.text,
    tokenCost: result.tokenCost,
    model: result.model,
  };
}
