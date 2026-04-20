"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitRetro } from "@/app/actions";

interface Defaults {
  shipped?: string;
  blocked?: string;
  learned?: string;
  surprised?: string;
  changing?: string;
}

interface Props {
  week: number;
  defaults?: Defaults;
}

export function RetroForm({ week, defaults }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitRetro(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={run} className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
      <input type="hidden" name="week" value={week} />

      <Field
        name="shipped"
        label="What did I ship this week?"
        hint={defaults?.shipped ? "Pre-filled with your passed task titles. Edit freely." : undefined}
        rows={6}
        defaultValue={defaults?.shipped ?? ""}
        disabled={pending}
      />
      <Field
        name="blocked"
        label="What blocked me?"
        rows={4}
        defaultValue={defaults?.blocked ?? ""}
        disabled={pending}
      />
      <Field
        name="learned"
        label="What did I learn that I didn't know last Sunday?"
        rows={4}
        defaultValue={defaults?.learned ?? ""}
        disabled={pending}
      />
      <Field
        name="surprised"
        label="What surprised me?"
        rows={4}
        defaultValue={defaults?.surprised ?? ""}
        disabled={pending}
      />
      <Field
        name="changing"
        label="What am I changing next week?"
        rows={4}
        defaultValue={defaults?.changing ?? ""}
        disabled={pending}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-red-600">{error}</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving + asking Claude…" : "Submit retro"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  rows,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  hint?: string;
  rows: number;
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`retro-${name}`}>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <Textarea
        id={`retro-${name}`}
        name={name}
        rows={rows}
        required
        maxLength={5000}
        defaultValue={defaultValue}
        disabled={disabled}
        className="font-mono text-sm"
      />
    </div>
  );
}
