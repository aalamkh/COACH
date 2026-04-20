"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getNextPhysicalAction } from "@/app/actions";

interface Reply {
  text: string;
  tokenCost: number;
  model: string;
  at: number;
}

export function NextActionButton({ taskId }: { taskId: number }) {
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    const fd = new FormData();
    fd.set("taskId", String(taskId));
    startTransition(async () => {
      const r = await getNextPhysicalAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setReply({ ...r.data, at: Date.now() });
    });
  }

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Stuck for a second?</h3>
          <p className="text-xs text-muted-foreground">
            One sentence. Defaults to Haiku (cheapest). Click whenever you don't know the next
            click.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={run} disabled={pending}>
          {pending ? "Thinking…" : reply ? "Ask again" : "What's my next physical action?"}
        </Button>
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      {reply ? (
        <div className="mt-3 rounded-md border bg-background px-4 py-3">
          <p className="text-sm">{reply.text}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {reply.tokenCost.toLocaleString()} tokens · {reply.model}
          </p>
        </div>
      ) : null}
    </section>
  );
}
