import "server-only";
import { z } from "zod";
import { generateJson, MissingApiKeyError, Type } from "./gemini";
import { readSettings } from "./env";
import type { Task } from "@/db/schema";

export { MissingApiKeyError };

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

const SYSTEM_PROMPT = `You are grading a mid-level developer's work on a specific task. Treat them as a peer, not a student. Be specific: cite exact words in their answer. No cheerleading language. If grade is not 'pass', give ONE concrete next action. Return JSON: {grade: 'pass' | 'revise' | 'fail', feedback_md: string, specific_issues: string[]}.

For github_commit, evaluate the actual diff against success criteria — do the files exist, does the code do what was asked, are there obvious bugs. For url, evaluate whether the page meets the success criteria.

When grading a resubmission, you MUST reference whether each previous specific_issue has been resolved. If the developer ignored prior feedback, say so directly.`;

export interface PreviousSubmissionContext {
  grade: string;
  feedbackMd: string;
  specificIssues: string[];
  content: string;
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
    const issues =
      previous.specificIssues.length > 0 ? previous.specificIssues.join(", ") : "(none listed)";
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

  const result = await generateJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: userMessage(
      params.task,
      params.submissionContent,
      params.extraContext ?? null,
      params.previousSubmission ?? null,
    ),
    model: gradingModel,
    temperature: 0.3,
    maxOutputTokens: 3000,
    schema: {
      type: Type.OBJECT,
      properties: {
        grade: { type: Type.STRING, enum: ["pass", "revise", "fail"] },
        feedback_md: { type: Type.STRING },
        specific_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["grade", "feedback_md", "specific_issues"],
    },
    zodSchema: gradeJsonSchema,
  });

  return {
    grade: result.data.grade,
    feedback_md: result.data.feedback_md,
    specific_issues: result.data.specific_issues,
    tokenCost: result.tokenCost,
    model: result.model,
  };
}
