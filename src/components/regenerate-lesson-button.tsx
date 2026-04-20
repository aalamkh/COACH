"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { regenerateLessonForTask } from "@/app/actions";

export function RegenerateLessonButton({ taskId }: { taskId: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function open() {
    dialogRef.current?.showModal();
  }
  function cancel() {
    dialogRef.current?.close();
  }
  function confirm() {
    const fd = new FormData();
    fd.set("taskId", String(taskId));
    startTransition(async () => {
      await regenerateLessonForTask(fd);
      dialogRef.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={open}
        disabled={pending}
        title="Delete and regenerate the lesson"
      >
        <RefreshIcon />
        Regenerate
      </Button>
      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="w-[min(90vw,420px)] space-y-3 p-5">
          <h2 className="text-base font-semibold">Regenerate this lesson?</h2>
          <p className="text-sm text-muted-foreground">
            Deletes the current lesson and its quiz questions / attempts. A new lesson is
            generated on the next visit.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={confirm} disabled={pending}>
              {pending ? "Regenerating…" : "Regenerate"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function RefreshIcon() {
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
