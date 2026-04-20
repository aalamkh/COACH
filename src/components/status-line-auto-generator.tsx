"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateStatusLineForToday } from "@/app/actions";
import { isBillingError } from "@/lib/billing-error";

export function StatusLineAutoGenerator() {
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
    const result = await generateStatusLineForToday();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (error) {
    if (isBillingError(error)) {
      return (
        <p className="text-sm text-muted-foreground">
          AI features paused — getting rate-limited. Wait a minute and refresh, or grab a fresh Gemini key at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            aistudio.google.com/apikey
          </a>
          .
        </p>
      );
    }
    return (
      <p className="text-sm text-amber-700 dark:text-amber-300">
        Status line couldn't generate: {error}
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">Pulling today's status line…</p>
  );
}
