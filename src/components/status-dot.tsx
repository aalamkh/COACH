import { cn } from "@/lib/utils";
import type { Grade, Status } from "@/db/schema";

const STATUS_CLASS: Record<Status, string> = {
  locked: "bg-muted-foreground/30",
  available: "bg-blue-500",
  in_progress: "bg-amber-500",
  passed: "bg-emerald-500",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      aria-label={status}
      title={status}
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        STATUS_CLASS[status],
        className,
      )}
    />
  );
}

const STATUS_BADGE_CLASS: Record<Status, string> = {
  locked: "bg-muted text-muted-foreground border-border",
  available: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  passed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const STATUS_LABEL: Record<Status, string> = {
  locked: "Locked",
  available: "Available",
  in_progress: "In progress",
  passed: "Passed",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        STATUS_BADGE_CLASS[status],
        className,
      )}
    >
      <StatusDot status={status} className="h-1.5 w-1.5" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const GRADE_BADGE_CLASS: Record<Grade, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  pass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  revise: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  fail: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  manual: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
};

const GRADE_LABEL: Record<Grade, string> = {
  pending: "Pending",
  pass: "Pass",
  revise: "Revise",
  fail: "Fail",
  manual: "Manual",
};

export function GradeBadge({ grade, className }: { grade: Grade; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        GRADE_BADGE_CLASS[grade],
        className,
      )}
    >
      {GRADE_LABEL[grade]}
    </span>
  );
}
