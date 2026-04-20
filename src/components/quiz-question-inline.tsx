"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { submitQuizAttempts } from "@/app/actions";
import { cn } from "@/lib/utils";

export interface InlineQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanationMd: string;
}

export interface InlineInitialAttempt {
  selectedIndex: number;
  correct: boolean;
}

interface Props {
  taskId: number;
  index: number;
  question: InlineQuestion;
  initialAttempt?: InlineInitialAttempt;
}

/**
 * One quiz question rendered inline next to the concept it tests. Each instance
 * has its own submit + try-again. Each submission inserts a single
 * quiz_attempts row via submitQuizAttempts (which already handles arbitrary
 * array sizes).
 */
export function QuizQuestionInline({ taskId, index, question, initialAttempt }: Props) {
  const hasPrior = !!initialAttempt;
  const [selected, setSelected] = useState<number | null>(
    hasPrior ? initialAttempt!.selectedIndex : null,
  );
  const [submitted, setSubmitted] = useState<boolean>(hasPrior);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isCorrect = submitted && selected === question.correctIndex;
  const isIncorrect = submitted && selected != null && selected !== question.correctIndex;

  function pick(i: number) {
    if (submitted || pending) return;
    setSelected(i);
  }

  function onSubmit() {
    if (selected == null) {
      setError("Pick an answer first.");
      return;
    }
    setError(null);
    setSubmitted(true);
    startTransition(async () => {
      const result = await submitQuizAttempts({
        taskId,
        answers: [{ questionId: question.id, selectedIndex: selected }],
      });
      if (!result.ok) {
        setError(result.error);
        setSubmitted(false);
        return;
      }
      router.refresh();
    });
  }

  function onTryAgain() {
    setSelected(null);
    setSubmitted(false);
    setError(null);
  }

  return (
    <section
      className={cn(
        "rounded-lg border p-4 shadow-sm transition-colors",
        submitted
          ? isCorrect
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-red-500/40 bg-red-500/5"
          : "border-border bg-card",
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Quick check {index + 1}
        </div>
        {submitted ? (isCorrect ? <CheckIcon /> : <XIcon />) : null}
      </header>
      <p className="mb-3 text-sm font-medium">{question.question}</p>
      <ul className="space-y-1.5">
        {question.options.map((opt, i) => {
          const checked = selected === i;
          const showAsCorrect = submitted && i === question.correctIndex;
          const showAsWrongPick = submitted && checked && !isCorrect;
          return (
            <li key={i}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm transition-colors",
                  submitted
                    ? showAsCorrect
                      ? "bg-emerald-500/10"
                      : showAsWrongPick
                        ? "bg-red-500/10"
                        : "opacity-70"
                    : checked
                      ? "bg-muted"
                      : "hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={i}
                  checked={checked}
                  disabled={submitted || pending}
                  onChange={() => pick(i)}
                  className="mt-0.5 cursor-pointer accent-foreground"
                />
                <span className="flex-1">{opt}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {submitted ? (
        <div className="mt-3 rounded border border-border bg-background/60 p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Why
          </div>
          <div className="markdown text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.explanationMd}</ReactMarkdown>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-red-600">{error}</p>
        {submitted ? (
          <Button type="button" variant="outline" size="sm" onClick={onTryAgain} disabled={pending}>
            Try again
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={onSubmit} disabled={pending}>
            {pending ? "Saving…" : "Submit answer"}
          </Button>
        )}
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-emerald-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Correct"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-red-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Incorrect"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
