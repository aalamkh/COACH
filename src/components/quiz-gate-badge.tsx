import Link from "next/link";
import { cn } from "@/lib/utils";
import type { QuizGateState } from "@/lib/quiz";

export function QuizGateBadge({
  state,
  taskId,
}: {
  state: QuizGateState;
  taskId: number;
}) {
  if (state.kind === "no_lesson" || state.kind === "no_questions") return null;

  const lessonHref = `/task/${taskId}?tab=lesson`;

  if (state.kind === "passed") {
    return (
      <Banner color="emerald" lessonHref={lessonHref}>
        <Dot color="emerald" />
        <span className="font-medium">Quiz passed.</span>
        <span className="text-muted-foreground">
          Submission below isn't blocked either way.
        </span>
      </Banner>
    );
  }

  if (state.kind === "not_attempted") {
    return (
      <Banner color="amber" lessonHref={lessonHref}>
        <Dot color="amber" />
        <span className="font-medium">Quiz recommended.</span>
        <span className="text-muted-foreground">
          Two questions in the lesson tab. Optional but a fast sanity check.
        </span>
      </Banner>
    );
  }

  // partial
  return (
    <Banner color="muted" lessonHref={lessonHref}>
      <Dot color="muted" />
      <span className="font-medium">
        Quiz attempted — {state.correct}/{state.total} correct.
      </span>
      <span className="text-muted-foreground">Retake on the lesson tab if you want.</span>
    </Banner>
  );
}

function Banner({
  children,
  color,
  lessonHref,
}: {
  children: React.ReactNode;
  color: "emerald" | "amber" | "muted";
  lessonHref: string;
}) {
  const palette: Record<"emerald" | "amber" | "muted", string> = {
    emerald:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
    muted: "border-border bg-muted/40 text-foreground",
  };
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm",
        palette[color],
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <Link
        href={lessonHref}
        className="shrink-0 text-xs font-medium underline-offset-2 hover:underline"
      >
        Lesson →
      </Link>
    </div>
  );
}

function Dot({ color }: { color: "emerald" | "amber" | "muted" }) {
  const cls: Record<"emerald" | "amber" | "muted", string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    muted: "bg-muted-foreground/60",
  };
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", cls[color])} />;
}
