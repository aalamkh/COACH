import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { notes, submissions, tasks, type Task } from "@/db/schema";
import { generateText, MissingApiKeyError } from "./gemini";
import { readSettings } from "./env";

export interface NextActionResult {
  text: string;
  tokenCost: number;
  model: string;
}

const SYSTEM_PROMPT = `Output the single smallest physical action the developer should take right now to move this task forward. One sentence. Imperative mood ("Open your terminal and run X"). No explanations. No alternatives. If they've already submitted, tell them to check the feedback. If they haven't started, give the first concrete command or click. Nothing else.`;

function clamp(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

export async function generateNextAction(task: Task): Promise<NextActionResult> {
  const { apiKey, nextActionModel } = await readSettings();
  if (!apiKey) throw new MissingApiKeyError();

  const lastSub = await db
    .select({ grade: submissions.grade, submittedAt: submissions.submittedAt })
    .from(submissions)
    .where(eq(submissions.taskId, task.id))
    .orderBy(desc(submissions.submittedAt))
    .limit(1)
    .get();

  const lastNote = await db
    .select({ body: notes.bodyMd, createdAt: notes.createdAt })
    .from(notes)
    .where(eq(notes.taskId, task.id))
    .orderBy(desc(notes.createdAt))
    .limit(1)
    .get();

  const submissionsBlock = lastSub
    ? `Submissions: yes — latest grade: ${lastSub.grade ?? "pending"} (${lastSub.submittedAt.toISOString()})`
    : "Submissions: none yet";

  const noteBlock = lastNote
    ? `Latest note for this task (${lastNote.createdAt.toISOString()}): ${clamp(lastNote.body, 600)}`
    : "Latest note for this task: (none)";

  const userMsg = `Task: ${task.title}
Week ${task.week} · Day ${task.day} · ${task.submissionType}

Description (markdown):
${task.descriptionMd}

Success criteria (markdown):
${task.successCriteriaMd}

${submissionsBlock}
${noteBlock}`;

  const result = await generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: userMsg,
    model: nextActionModel,
    temperature: 0.3,
    maxOutputTokens: 250,
  });

  return { text: result.text.trim(), tokenCost: result.tokenCost, model: result.model };
}
