import "server-only";
import { diffLines } from "diff";
import { fetchCommit, GithubFetchError } from "@/lib/github";
import type { SubmissionType } from "@/db/schema";

interface Props {
  type: SubmissionType;
  oldContent: string;
  newContent: string;
}

/**
 * "See what changed" body. For github_commit fetches both patches and renders
 * a unified line-level diff. For text_answer / url renders old vs new in two
 * columns.
 */
export async function ChangedView({ type, oldContent, newContent }: Props) {
  if (type === "github_commit") {
    return <GithubChanged oldUrl={oldContent} newUrl={newContent} />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Column title="Previous" body={oldContent} />
      <Column title="Current" body={newContent} />
    </div>
  );
}

function Column({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <pre className="whitespace-pre-wrap break-words text-xs">{body}</pre>
    </div>
  );
}

async function GithubChanged({ oldUrl, newUrl }: { oldUrl: string; newUrl: string }) {
  const [oldRes, newRes] = await Promise.allSettled([fetchCommit(oldUrl), fetchCommit(newUrl)]);
  const oldPatch = oldRes.status === "fulfilled" ? oldRes.value.diff : null;
  const newPatch = newRes.status === "fulfilled" ? newRes.value.diff : null;
  const oldErr =
    oldRes.status === "rejected" && oldRes.reason instanceof GithubFetchError
      ? oldRes.reason.message
      : null;
  const newErr =
    newRes.status === "rejected" && newRes.reason instanceof GithubFetchError
      ? newRes.reason.message
      : null;

  if (!oldPatch || !newPatch) {
    return (
      <div className="space-y-2 text-xs">
        <p className="text-amber-700 dark:text-amber-300">
          Couldn't fetch one or both commits to compute a line-by-line diff.
          {oldErr ? ` Previous: ${oldErr}.` : null}
          {newErr ? ` Current: ${newErr}.` : null}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <LinkCol title="Previous" url={oldUrl} />
          <LinkCol title="Current" url={newUrl} />
        </div>
      </div>
    );
  }

  const parts = diffLines(oldPatch, newPatch);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border bg-background">
        <pre className="m-0 p-3 text-[11px] leading-5">
          {parts.map((part, i) => {
            const lines = part.value.split("\n");
            if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
            const cls = part.added
              ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
              : part.removed
                ? "bg-red-500/15 text-red-900 dark:text-red-100"
                : "text-muted-foreground";
            const marker = part.added ? "+" : part.removed ? "-" : " ";
            return (
              <span key={i} className="block">
                {lines.map((l, j) => (
                  <span key={j} className={`block whitespace-pre ${cls}`}>
                    {marker} {l}
                  </span>
                ))}
              </span>
            );
          })}
        </pre>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/60" />
          added
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-red-500/60" />
          removed
        </span>
        <a
          href={oldUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-primary hover:underline"
        >
          Previous commit ↗
        </a>
        <a
          href={newUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Current commit ↗
        </a>
      </div>
    </div>
  );
}

function LinkCol({ title, url }: { title: string; url: string }) {
  return (
    <div className="rounded-md border bg-background p-3 text-xs">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
        {url}
      </a>
    </div>
  );
}
