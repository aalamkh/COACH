import "server-only";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tasks, type Briefing } from "@/db/schema";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { BriefingAutoGenerator } from "@/components/briefing-auto-generator";
import { RegenerateBriefingButton } from "@/components/regenerate-briefing-button";
import { loadTodayBriefing, todayLocalDate } from "@/lib/briefing";
import { readSettings } from "@/lib/env";

export async function BriefingCard() {
  const settings = await readSettings();
  if (!settings.dailyBriefingEnabled) return null;

  const briefing = (await loadTodayBriefing()) as Briefing | null;
  if (briefing) return <Filled briefing={briefing} />;

  if (!settings.apiKey) return <NoKey />;

  // Has API key, no row → render skeleton + auto-generator (client). Keeps it
  // non-blocking so today's tasks still render immediately below.
  return (
    <Shell title="Today's briefing" date={todayLocalDate()} body={<BriefingAutoGenerator />} />
  );
}

function NoKey() {
  return (
    <Shell
      title="Today's briefing"
      date={todayLocalDate()}
      body={
        <p className="text-sm text-muted-foreground">
          Set an Anthropic key in{" "}
          <Link href="/settings" className="text-primary hover:underline">
            /settings
          </Link>{" "}
          to start receiving daily coaching briefings.
        </p>
      }
    />
  );
}

async function Filled({ briefing }: { briefing: Briefing }) {
  let priorityTaskTitle: string | null = null;
  if (briefing.priorityTaskId != null) {
    const t = await db
      .select({ title: tasks.title, week: tasks.week, day: tasks.day })
      .from(tasks)
      .where(eq(tasks.id, briefing.priorityTaskId))
      .get();
    if (t) priorityTaskTitle = `W${t.week} D${t.day} · ${t.title}`;
  }

  return (
    <Shell
      title="Today's briefing"
      date={briefing.briefingDate}
      regenerate
      body={
        <div className="space-y-4">
          <Markdown>{briefing.messageMd}</Markdown>
          {briefing.priorityTaskId != null ? (
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <Link href={`/task/${briefing.priorityTaskId}`}>
                <Button size="sm">Start here →</Button>
              </Link>
              {priorityTaskTitle ? (
                <span className="text-xs text-muted-foreground">{priorityTaskTitle}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      }
    />
  );
}

function Shell({
  title,
  date,
  body,
  regenerate,
}: {
  title: string;
  date: string;
  body: React.ReactNode;
  regenerate?: boolean;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CompassIcon />
          <h2 className="text-sm font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">· {date}</span>
        </div>
        {regenerate ? <RegenerateBriefingButton /> : null}
      </header>
      <div>{body}</div>
    </section>
  );
}

function CompassIcon() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
