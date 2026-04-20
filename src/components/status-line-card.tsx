import "server-only";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { StatusLineAutoGenerator } from "@/components/status-line-auto-generator";
import { loadTodayStatusLine } from "@/lib/status";
import { readSettings } from "@/lib/env";
import type { StatusLine } from "@/db/schema";

export async function StatusLineCard() {
  const row = (await loadTodayStatusLine()) as StatusLine | null;
  if (row) return <Filled row={row} />;
  const { apiKey } = await readSettings();
  if (!apiKey) return <NoKey />;
  return <StatusLineAutoGenerator />;
}

function Filled({ row }: { row: StatusLine }) {
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <Markdown>{row.messageMd}</Markdown>
    </div>
  );
}

function NoKey() {
  return (
    <p className="text-sm text-muted-foreground">
      Add an Anthropic key in{" "}
      <Link href="/settings" className="text-primary hover:underline">
        /settings
      </Link>{" "}
      to see your honest status line each morning.
    </p>
  );
}
