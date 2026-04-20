"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestUnblockSuggestion } from "@/app/actions";

export function UnblockButton({ taskId }: { taskId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run() {
    setError(null);
    const fd = new FormData();
    fd.set("taskId", String(taskId));
    startTransition(async () => {
      const r = await requestUnblockSuggestion(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" onClick={run} disabled={pending}>
        {pending ? "Asking Claude…" : "Ask Claude what's likely blocking me"}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
