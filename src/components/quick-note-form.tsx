"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addNote } from "@/app/actions";

export function QuickNoteForm({ taskId, compact = false }: { taskId?: number; compact?: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const router = useRouter();

  function run(formData: FormData) {
    const body = formData.get("body");
    if (typeof body !== "string" || body.trim().length === 0) {
      setError("Required.");
      return;
    }
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await addNote(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form
      ref={formRef}
      action={run}
      className={compact ? "space-y-2" : "space-y-3 rounded-lg border bg-card p-5 shadow-sm"}
    >
      {taskId ? <input type="hidden" name="taskId" value={taskId} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor={`note-body-${taskId ?? "root"}`} className={compact ? "sr-only" : ""}>
          Quick note
        </Label>
        <Textarea
          id={`note-body-${taskId ?? "root"}`}
          name="body"
          rows={compact ? 3 : 4}
          required
          maxLength={10000}
          disabled={pending}
          placeholder={
            taskId
              ? "Jot something about this task. Markdown supported."
              : "Anything on your mind. Markdown supported."
          }
          className="text-sm"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          {error ? <span className="text-red-600">{error}</span> : null}
          {!error && saved ? <span className="text-emerald-700 dark:text-emerald-300">Saved.</span> : null}
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>
      </div>
    </form>
  );
}
