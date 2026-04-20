"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { snoozeTask, unsnoozeTask } from "@/app/actions";

interface Props {
  taskId: number;
  snoozedUntilIso: string | null;
}

export function SnoozeButtons({ taskId, snoozedUntilIso }: Props) {
  const dialog1 = useRef<HTMLDialogElement>(null);
  const dialog3 = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const snoozedUntil = snoozedUntilIso ? new Date(snoozedUntilIso) : null;
  const isSnoozed = !!snoozedUntil && snoozedUntil.getTime() > Date.now();

  function runSnooze(days: number) {
    const fd = new FormData();
    fd.set("taskId", String(taskId));
    fd.set("days", String(days));
    startTransition(async () => {
      await snoozeTask(fd);
      dialog1.current?.close();
      dialog3.current?.close();
      router.refresh();
    });
  }

  function runUnsnooze() {
    const fd = new FormData();
    fd.set("taskId", String(taskId));
    startTransition(async () => {
      await unsnoozeTask(fd);
      router.refresh();
    });
  }

  if (isSnoozed && snoozedUntil) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          Snoozed until {snoozedUntil.toLocaleDateString()}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runUnsnooze}
          disabled={pending}
        >
          {pending ? "Unsnoozing…" : "Unsnooze"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => dialog1.current?.showModal()}
        disabled={pending}
      >
        Snooze until tomorrow
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => dialog3.current?.showModal()}
        disabled={pending}
      >
        Snooze 3 days
      </Button>

      <ConfirmDialog
        dialogRef={dialog1}
        title="Snooze until tomorrow?"
        body="The task stays in-progress but won't appear on the dashboard until midnight tomorrow. Next tasks unlock normally when you pass this one."
        confirmLabel={pending ? "Snoozing…" : "Snooze"}
        onCancel={() => dialog1.current?.close()}
        onConfirm={() => runSnooze(1)}
        pending={pending}
      />
      <ConfirmDialog
        dialogRef={dialog3}
        title="Snooze 3 days?"
        body="The task stays in-progress but won't appear on the dashboard for the next 3 days. Next tasks still unlock normally on pass."
        confirmLabel={pending ? "Snoozing…" : "Snooze"}
        onCancel={() => dialog3.current?.close()}
        onConfirm={() => runSnooze(3)}
        pending={pending}
      />
    </>
  );
}

function ConfirmDialog({
  dialogRef,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  pending,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-black/40"
    >
      <div className="w-[min(90vw,420px)] space-y-3 p-5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
