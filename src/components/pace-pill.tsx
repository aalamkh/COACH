"use client";

import { useRef, useState } from "react";
import type { PaceLabel } from "@/db/schema";
import { cn } from "@/lib/utils";

interface Props {
  label: PaceLabel;
  weekNumber: number | null;
  statusMessageMd: string | null;
}

const TEXT: Record<PaceLabel, string> = {
  on_pace: "On pace",
  ahead: "Ahead of schedule",
  slightly_behind: "Slightly behind",
  off_track: "Off track",
};

const COLOR: Record<PaceLabel, string> = {
  on_pace: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  ahead: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  slightly_behind: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  off_track: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
};

const DOT: Record<PaceLabel, string> = {
  on_pace: "bg-emerald-500",
  ahead: "bg-emerald-500",
  slightly_behind: "bg-amber-500",
  off_track: "bg-amber-500",
};

export function PacePill({ label, weekNumber, statusMessageMd }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  const isOff = label === "off_track";

  function open() {
    setCopied(false);
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }

  async function copyAndOpenClaude() {
    const text = taRef.current?.value ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.open("https://claude.ai/new", "_blank", "noopener");
  }

  const inner = (
    <>
      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", DOT[label])} />
      {TEXT[label]}
    </>
  );

  if (!isOff) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
          COLOR[label],
        )}
      >
        {inner}
      </span>
    );
  }

  const prefilled = `I'm off track in Week ${weekNumber ?? "?"}. My status line said: '${
    (statusMessageMd ?? "").trim().replace(/\s+/g, " ")
  }'. What should I cut or change this week?`;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-amber-500/20 cursor-pointer",
          COLOR[label],
        )}
        title="Open the off-track escalation modal"
      >
        {inner}
      </button>
      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="w-[min(92vw,560px)] space-y-3 p-5">
          <h2 className="text-base font-semibold">Off track — escalate to Claude chat</h2>
          <p className="text-xs text-muted-foreground">
            The app deliberately doesn't try to coach the off-track case itself. Take this prompt
            into a real Claude conversation. Edit it if you want to add more context.
          </p>
          <textarea
            ref={taRef}
            defaultValue={prefilled}
            rows={6}
            className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={close}
              className="inline-flex h-8 items-center rounded-md px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
            <button
              type="button"
              onClick={copyAndOpenClaude}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {copied ? "Copied + opened ↗" : "Copy to clipboard, open Claude chat ↗"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
