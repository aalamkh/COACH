"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { regenerateLessonSimplerForTask } from "@/app/actions";

/**
 * "Teach this again, simpler" — single click, one API call. Replaces the
 * cached lesson with a regeneration that asks Claude for a different analogy
 * and shorter prose.
 */
export function RegenerateLessonSimplerButton({ taskId }: { taskId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run() {
    setError(null);
    const fd = new FormData();
    fd.set("taskId", String(taskId));
    startTransition(async () => {
      const r = await regenerateLessonSimplerForTask(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={run}
        disabled={pending}
        title="One API call. Same prompt + 'pick a different analogy, go simpler'."
      >
        {pending ? "Re-teaching…" : "Teach this again, simpler"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
