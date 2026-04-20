"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { regenerateBriefingForToday } from "@/app/actions";

export function RegenerateBriefingButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }
  function cancel() {
    dialogRef.current?.close();
  }
  function confirm() {
    startTransition(async () => {
      const r = await regenerateBriefingForToday();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={open}
        disabled={pending}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Regenerate
      </Button>
      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="w-[min(90vw,420px)] space-y-3 p-5">
          <h2 className="text-base font-semibold">Regenerate today's briefing?</h2>
          <p className="text-sm text-muted-foreground">
            Replaces today's briefing row with a fresh Claude call. Costs another ~400 output
            tokens.
          </p>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
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
