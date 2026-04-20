"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { regenerateRetroAction } from "@/app/actions";

export function RegenerateRetroButton({ week }: { week: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function open() {
    dialogRef.current?.showModal();
  }
  function cancel() {
    dialogRef.current?.close();
  }
  function confirm() {
    const fd = new FormData();
    fd.set("week", String(week));
    startTransition(async () => {
      await regenerateRetroAction(fd);
      dialogRef.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open} disabled={pending}>
        Regenerate assessment
      </Button>
      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="w-[min(90vw,420px)] space-y-3 p-5">
          <h2 className="text-base font-semibold">Regenerate assessment?</h2>
          <p className="text-sm text-muted-foreground">
            Calls Claude again with the same retro answers and the same week data. The previous
            assessment is replaced. Tokens are added to the running total.
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
