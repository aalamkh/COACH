import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { notes, submissions, tasks, type Task } from "@/db/schema";
import { MissingApiKeyError } from "./anthropic";
import { MODEL_IDS, readSettings } from "./env";

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

  const lastSub = db
    .select({ grade: submissions.grade, submittedAt: submissions.submittedAt })
    .from(submissions)
    .where(eq(submissions.taskId, task.id))
    .orderBy(desc(submissions.submittedAt))
    .limit(1)
    .get();

  const lastNote = db
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

  // Defaults to Haiku for this surface — designed to be cheap and used often.
  // Override via /settings → Coaching → Next-action model.
  const model = MODEL_IDS[nextActionModel];
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 150,
    temperature: 0.3,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMsg }],
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

  return { text: textBlock.text.trim(), tokenCost, model };
}
