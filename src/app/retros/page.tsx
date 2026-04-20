import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { retros } from "@/db/schema";

export const dynamic = "force-dynamic";

function firstParagraph(md: string | null): string {
  if (!md) return "";
  const trimmed = md.trim();
  const idx = trimmed.indexOf("\n\n");
  const slice = idx === -1 ? trimmed : trimmed.slice(0, idx);
  // Drop leading markdown heading hashes for the preview
  return slice.replace(/^#+\s*/, "").trim();
}

export default async function RetrosIndex() {
  const rows = db
    .select({
      week: retros.week,
      generatedAt: retros.generatedAt,
      assessmentMd: retros.claudeAssessmentMd,
    })
    .from(retros)
    .orderBy(asc(retros.week))
    .all();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Retros</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} of 14 weeks reflected on. Click any retro to read the full assessment.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
          No retros yet. Finish a week's last task to get the "Ready for retro?" banner on the
          dashboard, or jump straight into one from the URL{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/retro/&lt;week&gt;</code>.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.week}>
              <Link
                href={`/retro/${r.week}`}
                className="block rounded-lg border bg-card p-5 shadow-sm transition-colors hover:bg-muted/30"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">Week {r.week}</h2>
                  <span className="text-xs text-muted-foreground">
                    {r.generatedAt.toLocaleDateString()}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {firstParagraph(r.assessmentMd) || "(no assessment yet)"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
