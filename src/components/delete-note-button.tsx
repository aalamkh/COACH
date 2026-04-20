"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteNote } from "@/app/actions";

export function DeleteNoteButton({ noteId }: { noteId: number }) {
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
    fd.set("id", String(noteId));
    startTransition(async () => {
      await deleteNote(fd);
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
        Delete
      </Button>
      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="w-[min(90vw,360px)] space-y-3 p-5">
          <h2 className="text-base font-semibold">Delete this note?</h2>
          <p className="text-sm text-muted-foreground">Can't be undone.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirm}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
