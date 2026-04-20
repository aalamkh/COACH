import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MissingApiKeyError } from "./anthropic";
import { MODEL_IDS, readSettings } from "./env";
import type { Task } from "@/db/schema";

export const lessonJsonSchema = z.object({
  concepts_md: z.string().min(1),
  worked_example_md: z.string().min(1),
  diagram_mermaid: z.string().min(1).nullable(),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).length(3),
        correct_index: z.number().int().min(0).max(2),
        explanation_md: z.string().min(1),
      }),
    )
    .length(2),
});
export type LessonJson = z.infer<typeof lessonJsonSchema>;

export interface LessonResult extends LessonJson {
  tokenCost: number;
  model: string;
}

const SYSTEM_PROMPT = `Generate a lesson for a developer who wants things explained simply, in plain everyday English. This developer knows React and TypeScript but treats every new topic as new — do not assume prior backend, database, or AI knowledge unless the task topic is clearly a follow-on. Return JSON with these keys.

concepts_md — exactly 3 markdown h3 sections. The format for each section is:

- First line under the h3: a one-sentence definition in plain language. No jargon. If you must use a technical term, the sentence itself defines it. Example of good: 'A webhook is when one service pings another service's URL to say "something happened."' Example of bad: 'A webhook is an HTTP callback for event-driven architectures.'
- Second paragraph: a real-world analogy from daily life — food delivery, courier packages, a waiter taking orders, a doorbell, a bank teller, WhatsApp read receipts, a locked gym locker, house keys, postal mail. Pick the analogy that makes the specific concept click, not a generic one. Make the analogy specific enough to picture.
- Third paragraph: why this matters in the actual product the developer is building (a 14-week plan to ship a paid niche SaaS). Concrete stake — 'without this, any user can read any other user's data' is better than 'this is important for security.'

worked_example_md — one code example, 15-40 lines max. Every non-obvious line has a // ← inline comment in everyday English. Before the code block, one sentence describing what the code does in plain language ('This is how the app checks whether the person logging in is who they say they are.'). After the code block, one sentence naming what the developer should notice or imitate ('Notice that we never trust the user's input — we always look them up fresh from the database.').

diagram_mermaid — include a mermaid diagram if the concept has a flow, a structure, or a sequence. Skip if the concept is purely code-level. Label nodes in plain language, not technical shorthand.

questions — 2 multiple-choice questions. Each question tests understanding via a scenario, not definitions. Bad question: 'What is a webhook?' Good question: 'Your app needs to know when a user cancels their Stripe subscription. Which approach fits best?' Each option should be plausible-sounding — no obvious wrong answers. explanation_md for each: one sentence on why the right answer is right, one sentence on the most common wrong answer and why it's tempting but wrong.

Hard rules. No 'great question.' No 'as you can see.' No 'simply.' No 'just.' No 'it's important to understand that.' No filler. If a sentence could be deleted without losing meaning, delete it before returning. Target reading level: a smart 16-year-old who has never coded for a paycheck. Length target for full lesson: 500-900 words of prose total across concepts_md and the prose parts of worked_example_md.`;

const TOOL = {
  name: "submit_lesson",
  description: "Return the lesson payload as structured JSON.",
  input_schema: {
    type: "object" as const,
    properties: {
      concepts_md: { type: "string" },
      worked_example_md: { type: "string" },
      diagram_mermaid: { type: ["string", "null"] },
      questions: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
            correct_index: { type: "integer", minimum: 0, maximum: 2 },
            explanation_md: { type: "string" },
          },
          required: ["question", "options", "correct_index", "explanation_md"],
        },
      },
    },
    required: ["concepts_md", "worked_example_md", "diagram_mermaid", "questions"],
  },
};

function userMessage(task: Task) {
  return `Task title: ${task.title}

Task description (markdown):
${task.descriptionMd}

Success criteria (markdown):
${task.successCriteriaMd}

Submission type: ${task.submissionType}`;
}

export const SIMPLER_INSTRUCTION = `The developer read the previous lesson and wants it even simpler, with a different real-world analogy. Pick a different analogy from before and go one step more concrete. Shorter, not longer.`;

export async function generateLesson(
  task: Task,
  extraInstruction?: string,
): Promise<LessonResult> {
  const { apiKey, lessonModel } = await readSettings();
  if (!apiKey) throw new MissingApiKeyError();

  const client = new Anthropic({ apiKey });
  const systemText = extraInstruction
    ? `${SYSTEM_PROMPT}\n\n${extraInstruction}`
    : SYSTEM_PROMPT;

  const response = await client.messages.create({
    model: MODEL_IDS[lessonModel],
    max_tokens: 4000,
    temperature: 0.4,
    system: [
      {
        type: "text",
        text: systemText,
        // Only cache the canonical prompt; the simpler-variant has its own
        // cache miss but the savings still apply across plain regens.
        ...(extraInstruction ? {} : { cache_control: { type: "ephemeral" as const } }),
      },
    ],
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [{ role: "user", content: userMessage(task) }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Anthropic response missing tool_use block.");
  }

  const parsed = lessonJsonSchema.parse(toolUse.input);
  const tokenCost =
    (response.usage.input_tokens ?? 0) +
    (response.usage.output_tokens ?? 0) +
    (response.usage.cache_creation_input_tokens ?? 0) +
    (response.usage.cache_read_input_tokens ?? 0);

  return { ...parsed, tokenCost, model: MODEL_IDS[lessonModel] };
}
