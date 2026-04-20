import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODEL_IDS, readSettings } from "./env";
import type { Task } from "@/db/schema";

export const gradeJsonSchema = z.object({
  grade: z.enum(["pass", "revise", "fail"]),
  feedback_md: z.string().min(1),
  specific_issues: z.array(z.string()),
});
export type GradeJson = z.infer<typeof gradeJsonSchema>;

export interface GradeResult {
  grade: GradeJson["grade"];
  feedback_md: string;
  specific_issues: string[];
  tokenCost: number;
  model: string;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY not set. Add it in /settings.");
    this.name = "MissingApiKeyError";
  }
}

const SYSTEM_PROMPT = `You are grading a mid-level developer's work on a specific task. Treat them as a peer, not a student. Be specific: cite exact words in their answer. No cheerleading language. If grade is not 'pass', give ONE concrete next action. Return JSON: {grade: 'pass' | 'revise' | 'fail', feedback_md: string, specific_issues: string[]}.

For github_commit, evaluate the actual diff against success criteria — do the files exist, does the code do what was asked, are there obvious bugs. For url, evaluate whether the page meets the success criteria.

When grading a resubmission, you MUST reference whether each previous specific_issue has been resolved. If the developer ignored prior feedback, say so directly.`;

const TOOL_DEFINITION = {
  name: "submit_grade",
  description:
    "Return the grade, feedback_md (GitHub-flavored markdown), and specific_issues (list of citeable problems, empty array if grade=pass).",
  input_schema: {
    type: "object" as const,
    properties: {
      grade: { type: "string", enum: ["pass", "revise", "fail"] },
      feedback_md: { type: "string" },
      specific_issues: { type: "array", items: { type: "string" } },
    },
    required: ["grade", "feedback_md", "specific_issues"],
  },
};

export interface PreviousSubmissionContext {
  grade: string;
  feedbackMd: string;
  specificIssues: string[];
  content: string;
  /** For github_commit: the diff of the previous commit (optional). */
  oldDiffBlock?: string | null;
}

function userMessage(
  task: Task,
  submissionContent: string,
  extraContext: string | null,
  previous: PreviousSubmissionContext | null,
): string {
  let message = `Task title: ${task.title}

Task description (markdown):
${task.descriptionMd}

Success criteria (markdown):
${task.successCriteriaMd}

Submission type: ${task.submissionType}

Developer's submission:
${submissionContent}`;

  if (extraContext) message += `\n\n${extraContext}`;

  if (previous) {
    const issues = previous.specificIssues.length > 0 ? previous.specificIssues.join(", ") : "(none listed)";
    message += `\n\nPREVIOUS SUBMISSION FEEDBACK (grade: ${previous.grade}):
${previous.feedbackMd}

PREVIOUS SPECIFIC ISSUES:
${issues}

The developer is resubmitting. Evaluate whether the previous issues have been addressed. Acknowledge specifically what changed and what still needs work.`;

    if (previous.oldDiffBlock) {
      message += `\n\nPREVIOUS COMMIT DIFF (what they had before this resubmission):\n${previous.oldDiffBlock}`;
    }
  }

  return message;
}

export async function gradeSubmission(params: {
  task: Task;
  submissionContent: string;
  extraContext?: string | null;
  previousSubmission?: PreviousSubmissionContext | null;
}): Promise<GradeResult> {
  const { apiKey, gradingModel } = await readSettings();
  if (!apiKey) throw new MissingApiKeyError();

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL_IDS[gradingModel],
    max_tokens: 2000,
    temperature: 0.3,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [TOOL_DEFINITION],
    tool_choice: { type: "tool", name: TOOL_DEFINITION.name },
    messages: [
      {
        role: "user",
        content: userMessage(
          params.task,
          params.submissionContent,
          params.extraContext ?? null,
          params.previousSubmission ?? null,
        ),
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Anthropic response missing tool_use block.");
  }

  const parsed = gradeJsonSchema.parse(toolUse.input);
  const tokenCost =
    (response.usage.input_tokens ?? 0) +
    (response.usage.output_tokens ?? 0) +
    (response.usage.cache_creation_input_tokens ?? 0) +
    (response.usage.cache_read_input_tokens ?? 0);

  return {
    grade: parsed.grade,
    feedback_md: parsed.feedback_md,
    specific_issues: parsed.specific_issues,
    tokenCost,
    model: MODEL_IDS[gradingModel],
  };
}
