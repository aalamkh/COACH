"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateLessonForTask } from "@/app/actions";

export function LessonAutoGenerator({ taskId }: { taskId: number }) {
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
    const fd = new FormData();
    fd.set("taskId", String(taskId));
    const result = await generateLessonForTask(fd);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-900 dark:text-amber-200">
        <p>{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            fired.current = false;
            void start();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
      <Spinner />
      <span>Generating lesson… this can take 30–60 seconds.</span>
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
