"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportAllData } from "@/app/actions";

export function ExportButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function run() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await exportAllData();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const json = JSON.stringify(result.data.payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Slight delay before revoking so the browser can start the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const sizeKb = (blob.size / 1024).toFixed(1);
      setInfo(`Saved ${result.data.filename} · ${sizeKb} KB`);
      setTimeout(() => setInfo(null), 5000);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" onClick={run} disabled={pending}>
        {pending ? "Exporting…" : "Export all data"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {!error && info ? (
        <span className="text-xs text-emerald-700 dark:text-emerald-300">{info}</span>
      ) : null}
    </div>
  );
}
