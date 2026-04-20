"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { submitQuizAttempts } from "@/app/actions";
import { cn } from "@/lib/utils";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanationMd: string;
}

export interface InitialAttempt {
  selectedIndex: number;
  correct: boolean;
}

interface Props {
  taskId: number;
  questions: QuizQuestion[];
  /** Latest attempt per question id, if any. */
  initialAttempts: Record<number, InitialAttempt>;
}

export function QuizSection({ taskId, questions, initialAttempts }: Props) {
  // If we have any prior attempts, hydrate as "submitted" so the user sees their last results.
  const hasPriorAttempts = Object.keys(initialAttempts).length > 0;

  const initialSelections = useMemo<Record<number, number | null>>(() => {
    const out: Record<number, number | null> = {};
    for (const q of questions) {
      const prev = initialAttempts[q.id];
      out[q.id] = prev ? prev.selectedIndex : null;
    }
    return out;
  }, [questions, initialAttempts]);

  const [selections, setSelections] = useState<Record<number, number | null>>(initialSelections);
  const [submitted, setSubmitted] = useState<boolean>(hasPriorAttempts);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function pick(qid: number, idx: number) {
    if (submitted) return;
    setSelections((prev) => ({ ...prev, [qid]: idx }));
  }

  function onSubmit() {
    setError(null);
    const unanswered = questions.find((q) => selections[q.id] == null);
    if (unanswered) {
      setError("Answer every question before submitting.");
      return;
    }
    const answers = questions.map((q) => ({
      questionId: q.id,
      selectedIndex: selections[q.id]!,
    }));
    setSubmitted(true);
    startTransition(async () => {
      const result = await submitQuizAttempts({ taskId, answers });
      if (!result.ok) {
        setError(result.error);
        setSubmitted(false);
        return;
      }
      router.refresh();
    });
  }

  function onTryAgain() {
    setSelections(() => {
      const cleared: Record<number, number | null> = {};
      for (const q of questions) cleared[q.id] = null;
      return cleared;
    });
    setSubmitted(false);
    setError(null);
  }

  if (questions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No quiz questions in this lesson.</p>
    );
  }

  const correctCount = submitted
    ? questions.filter((q) => selections[q.id] === q.correctIndex).length
    : 0;

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Quick check</h3>
        {submitted ? (
          <span className="text-xs text-muted-foreground">
            {correctCount} / {questions.length} correct
          </span>
        ) : null}
      </header>

      <ol className="space-y-4">
        {questions.map((q, idx) => {
          const selected = selections[q.id];
          const isCorrect = submitted && selected === q.correctIndex;
          const isIncorrect = submitted && selected != null && selected !== q.correctIndex;
          return (
            <li
              key={q.id}
              className={cn(
                "rounded-lg border p-4 shadow-sm transition-colors",
                submitted
                  ? isCorrect
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-red-500/40 bg-red-500/5"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">
                  <span className="mr-1 text-muted-foreground">{idx + 1}.</span>
                  {q.question}
                </p>
                {submitted ? (
                  isCorrect ? (
                    <CheckIcon />
                  ) : (
                    <XIcon />
                  )
                ) : null}
              </div>

              <ul className="mt-3 space-y-1.5">
                {q.options.map((opt, i) => {
                  const checked = selected === i;
                  const showAsCorrect = submitted && i === q.correctIndex;
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
                          name={`q-${q.id}`}
                          value={i}
                          checked={checked}
                          disabled={submitted || pending}
                          onChange={() => pick(q.id, i)}
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.explanationMd}</ReactMarkdown>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-red-600">{error}</p>
        {submitted ? (
          <Button type="button" variant="outline" size="sm" onClick={onTryAgain} disabled={pending}>
            Try again
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={onSubmit} disabled={pending}>
            {pending ? "Saving…" : "Submit answers"}
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
