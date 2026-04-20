"use client";

import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markPassedOverride } from "@/app/actions";

export function OverrideButton({ taskId }: { taskId: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
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
      await markPassedOverride(fd);
      dialogRef.current?.close();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open} disabled={pending}>
        Mark passed anyway
      </Button>
      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="w-[min(90vw,420px)] space-y-3 p-5">
          <h2 className="text-base font-semibold">Mark passed without grading?</h2>
          <p className="text-sm text-muted-foreground">
            This skips Claude grading and logs a submission with grade{" "}
            <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">manual</span>. The
            next task will be unlocked.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={confirm} disabled={pending}>
              {pending ? "Marking…" : "Mark passed"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
