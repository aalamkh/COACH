"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateBriefingForToday } from "@/app/actions";
import { isBillingError } from "@/lib/billing-error";

export function BriefingAutoGenerator() {
  const router = useRouter();
  const fired = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError(null);
    const result = await generateBriefingForToday();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (error) {
    if (isBillingError(error)) return null;
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
        Briefing didn't generate: {error}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <Spinner />
      <div>
        <div className="text-sm font-medium">Generating today's briefing…</div>
        <div className="text-xs text-muted-foreground">A few seconds. Won't block your work.</div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
