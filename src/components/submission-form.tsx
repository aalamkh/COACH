"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitTask } from "@/app/actions";
import type { SubmissionType } from "@/db/schema";

interface Props {
  taskId: number;
  submissionType: SubmissionType;
  resubmit: boolean;
}

type ToastState = { kind: "success" | "error"; message: string; retry?: FormData } | null;

const HINTS: Record<SubmissionType, string> = {
  text_answer: "Markdown supported. Min 10 characters.",
  github_commit: "Paste the full commit URL: https://github.com/owner/repo/commit/<sha>",
  url: "Paste a public URL. Claude reads the page text and grades it.",
};

const PLACEHOLDERS: Record<SubmissionType, string> = {
  text_answer: "",
  github_commit: "https://github.com/aalamkh/coach/commit/abc1234",
  url: "https://…",
};

export function SubmissionForm({ taskId, submissionType, resubmit }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (toast?.kind !== "success") return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function run(formData: FormData) {
    const content = formData.get("content");
    if (typeof content !== "string" || content.trim().length === 0) {
      setClientError("Required.");
      return;
    }
    if (submissionType === "text_answer" && content.trim().length < 10) {
      setClientError("Answer must be at least 10 characters.");
      return;
    }
    setClientError(null);
    setToast(null);

    startTransition(async () => {
      const result = await submitTask(formData);
      if (result.ok) {
        const labels: Record<string, string> = {
          pass: "Passed. Next task unlocked.",
          revise: "Graded: revise.",
          fail: "Graded: fail.",
        };
        setToast({ kind: "success", message: labels[result.data.grade] ?? "Graded." });
        if (result.data.grade === "pass") formRef.current?.reset();
      } else {
        setToast({ kind: "error", message: result.error, retry: formData });
      }
    });
  }

  function retry() {
    if (!toast?.retry) return;
    const fd = toast.retry;
    setToast(null);
    run(fd);
  }

  const labelText = resubmit ? "Resubmit" : labelFor(submissionType);

  return (
    <div className="space-y-3">
      <form
        ref={formRef}
        action={run}
        className="space-y-3 rounded-lg border bg-card p-5 shadow-sm"
      >
        <input type="hidden" name="taskId" value={taskId} />
        <div className="space-y-1.5">
          <Label htmlFor={`content-${taskId}`}>{labelText}</Label>
          <p className="text-xs text-muted-foreground">{HINTS[submissionType]}</p>
          {submissionType === "text_answer" ? (
            <Textarea
              id={`content-${taskId}`}
              name="content"
              rows={10}
              required
              disabled={pending}
              minLength={10}
              maxLength={20000}
              className="font-mono text-sm"
              placeholder="Markdown supported. Min 10 characters."
            />
          ) : (
            <Input
              id={`content-${taskId}`}
              name="content"
              type="url"
              required
              disabled={pending}
              maxLength={2000}
              placeholder={PLACEHOLDERS[submissionType]}
              className="font-mono text-sm"
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-red-600">{clientError}</p>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending
              ? gradingLabel(submissionType)
              : resubmit
                ? "Resubmit for grading"
                : "Submit for grading"}
          </Button>
        </div>
      </form>

      {toast ? (
        <div
          role="status"
          className={
            toast.kind === "success"
              ? "flex items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
              : "flex items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200"
          }
        >
          <span className="min-w-0 break-words">{toast.message}</span>
          <div className="flex shrink-0 gap-2">
            {toast.kind === "error" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={retry}
                disabled={pending}
              >
                Retry
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setToast(null)}
              disabled={pending}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function labelFor(type: SubmissionType): string {
  if (type === "text_answer") return "Your answer";
  if (type === "github_commit") return "Commit URL";
  return "Public URL";
}

function gradingLabel(type: SubmissionType): string {
  if (type === "github_commit") return "Fetching diff + grading…";
  if (type === "url") return "Fetching page + grading…";
  return "Grading…";
}

function Spinner() {
  return (
    <svg
      className="mr-1 h-3 w-3 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
