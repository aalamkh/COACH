"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dismissUnblockSuggestion } from "@/app/actions";

export function DismissSuggestionButton({ id, taskId }: { id: number; taskId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run() {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("taskId", String(taskId));
    startTransition(async () => {
      await dismissUnblockSuggestion(fd);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={run}
      disabled={pending}
      className="text-xs text-muted-foreground hover:text-foreground"
    >
      {pending ? "Dismissing…" : "Mark unblocked"}
    </Button>
  );
}
