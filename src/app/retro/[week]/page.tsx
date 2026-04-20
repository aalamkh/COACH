import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { retros, type Retro } from "@/db/schema";
import { Markdown } from "@/components/markdown";
import { RetroForm } from "@/components/retro-form";
import { RegenerateRetroButton } from "@/components/regenerate-retro-button";
import { passedTitlesForWeek } from "@/lib/retro";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ week: string }>;
}

export default async function RetroPage({ params }: PageProps) {
  const { week: weekParam } = await params;
  const week = Number(weekParam);
  if (!Number.isInteger(week) || week < 1 || week > 14) notFound();

  const retro = ((await db
    .select()
    .from(retros)
    .where(eq(retros.week, week))
    .get()) ?? null) as Retro | null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <Link href="/retros" className="hover:text-foreground">
          ← All retros
        </Link>
        <span>Week {week}</span>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Week {week} retro</h1>
        <p className="text-sm text-muted-foreground">
          {retro
            ? `Submitted ${retro.generatedAt.toLocaleString()}.`
            : "Five questions. Answer honestly. Claude reads everything you shipped this week and the answers, then writes an assessment."}
        </p>
      </header>

      {retro ? <RetroResults retro={retro} /> : <FormSection week={week} />}
    </div>
  );
}

async function FormSection({ week }: { week: number }) {
  const passed = await passedTitlesForWeek(week);
  const draftShipped =
    passed.length === 0 ? "" : passed.map((p) => `- W${week} D${p.day}: ${p.title}`).join("\n");
  return <RetroForm week={week} defaults={{ shipped: draftShipped }} />;
}

function RetroResults({ retro }: { retro: Retro }) {
  const a = retro.answersJson;
  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Your answers</h2>
        <dl className="space-y-4 text-sm">
          <Pair label="What I shipped" value={a.shipped} />
          <Pair label="What blocked me" value={a.blocked} />
          <Pair label="What I learned" value={a.learned} />
          <Pair label="What surprised me" value={a.surprised} />
          <Pair label="What I'm changing" value={a.changing} />
        </dl>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Claude's assessment</h2>
          <RegenerateRetroButton week={retro.week} />
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          {retro.claudeAssessmentMd ? (
            <Markdown>{retro.claudeAssessmentMd}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">
              Assessment didn't generate. Click Regenerate to try again (uses your current API
              key + grading model).
            </p>
          )}
        </div>
        {retro.tokenCost > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {retro.tokenCost.toLocaleString()} tokens used.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-border pl-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap font-mono text-xs">{value}</dd>
    </div>
  );
}
