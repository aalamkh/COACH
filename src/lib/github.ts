import "server-only";

export class GithubFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubFetchError";
  }
}

export interface GithubCommit {
  message: string;
  diff: string;
  truncated: boolean;
  filesChanged: number;
}

export interface RecentCommit {
  sha: string;
  repo: string;
  message: string;
  url: string;
  date: string;
}

const COMMIT_URL_RE =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/commit\/([a-f0-9]{7,40})\/?(?:[?#].*)?$/i;

export interface ParsedCommitRef {
  owner: string;
  repo: string;
  sha: string;
}

export function parseCommitUrl(input: string): ParsedCommitRef | null {
  const m = COMMIT_URL_RE.exec(input.trim());
  if (!m) return null;
  return { owner: m[1]!, repo: m[2]!, sha: m[3]! };
}

const TTL_MS = 5 * 60 * 1000;
const MAX_DIFF_CHARS = 8000;

interface CacheEntry {
  value: GithubCommit;
  expiresAt: number;
}

// Survives HMR by binding to globalThis.
const globalCache = globalThis as unknown as {
  __coachGithubCache?: Map<string, CacheEntry>;
  __coachGithubEventsCache?: Map<string, { value: RecentCommit[]; expiresAt: number }>;
};
const cache: Map<string, CacheEntry> =
  globalCache.__coachGithubCache ?? (globalCache.__coachGithubCache = new Map());
const eventsCache: Map<string, { value: RecentCommit[]; expiresAt: number }> =
  globalCache.__coachGithubEventsCache ??
  (globalCache.__coachGithubEventsCache = new Map());

export async function fetchCommit(input: string): Promise<GithubCommit> {
  const parsed = parseCommitUrl(input);
  if (!parsed) {
    throw new GithubFetchError(
      "URL must look like https://github.com/owner/repo/commit/<sha>.",
    );
  }
  const { owner, repo, sha } = parsed;
  const key = `${owner}/${repo}@${sha}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
      headers: { "User-Agent": "coach-local", Accept: "application/vnd.github+json" },
    });
  } catch {
    throw new GithubFetchError("Couldn't reach GitHub. Check your network and retry.");
  }

  if (res.status === 404) {
    throw new GithubFetchError("Commit not found or repo private.");
  }
  if (res.status === 403) {
    throw new GithubFetchError(
      "GitHub rate limit hit (60 req/h for unauthenticated). Try again in a few minutes.",
    );
  }
  if (!res.ok) {
    throw new GithubFetchError(`GitHub API error (${res.status}).`);
  }

  const data = (await res.json()) as {
    commit: { message: string };
    files?: Array<{ filename: string; status?: string; patch?: string }>;
  };

  const message = data.commit.message;
  const files = data.files ?? [];
  const filesChanged = files.length;

  const blocks: string[] = [];
  for (const f of files) {
    if (f.patch) {
      blocks.push(`--- ${f.filename}${f.status ? ` (${f.status})` : ""}\n${f.patch}`);
    } else {
      blocks.push(`--- ${f.filename}${f.status ? ` (${f.status})` : ""}\n(no patch — binary, renamed, or too large)`);
    }
  }
  const joined = blocks.join("\n\n");
  const truncated = joined.length > MAX_DIFF_CHARS;
  const diff = truncated ? joined.slice(0, MAX_DIFF_CHARS) + "\n…[truncated]" : joined;

  const value: GithubCommit = { message, diff, truncated, filesChanged };
  cache.set(key, { value, expiresAt: now + TTL_MS });
  return value;
}

/** Last N commits across PushEvents for a user. 5-minute cache. Returns [] on error. */
export async function recentPushCommits(
  username: string,
  limit = 5,
): Promise<RecentCommit[]> {
  if (!username) return [];
  const key = `events:${username}|${limit}`;
  const now = Date.now();
  const cached = eventsCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  let res: Response;
  try {
    res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=30`,
      {
        headers: { "User-Agent": "coach-local", Accept: "application/vnd.github+json" },
      },
    );
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const events = (await res.json()) as Array<{
    type: string;
    repo: { name: string };
    created_at: string;
    payload?: {
      head?: string;
      ref?: string;
      commits?: Array<{ sha: string; message: string }>;
    };
  }>;

  interface Pending {
    repo: string;
    sha: string;
    message: string | null; // null = needs enrichment
    url: string;
    date: string;
  }

  const pending: Pending[] = [];
  for (const e of events) {
    if (e.type !== "PushEvent") continue;
    const inline = e.payload?.commits ?? [];
    if (inline.length > 0) {
      // Legacy path: use the last commit in the push (head).
      const c = inline[inline.length - 1]!;
      pending.push({
        repo: e.repo.name,
        sha: c.sha,
        message: (c.message.split("\n")[0] ?? c.message).trim(),
        url: `https://github.com/${e.repo.name}/commit/${c.sha}`,
        date: e.created_at,
      });
    } else if (e.payload?.head) {
      // New API shape: commits[] is empty. Enrich from /repos/:r/commits/:sha below.
      pending.push({
        repo: e.repo.name,
        sha: e.payload.head,
        message: null,
        url: `https://github.com/${e.repo.name}/commit/${e.payload.head}`,
        date: e.created_at,
      });
    }
    if (pending.length >= limit) break;
  }

  // Enrich missing messages with one follow-up fetch per PushEvent (bounded by limit).
  await Promise.all(
    pending.map(async (p) => {
      if (p.message !== null) return;
      try {
        const r = await fetch(
          `https://api.github.com/repos/${p.repo}/commits/${p.sha}`,
          {
            headers: {
              "User-Agent": "coach-local",
              Accept: "application/vnd.github+json",
            },
          },
        );
        if (!r.ok) {
          p.message = `Push to ${p.repo}`;
          return;
        }
        const data = (await r.json()) as { commit?: { message?: string } };
        const first = (data.commit?.message ?? "").split("\n")[0]?.trim();
        p.message = first || `Push to ${p.repo}`;
      } catch {
        p.message = `Push to ${p.repo}`;
      }
    }),
  );

  const out: RecentCommit[] = pending.map((p) => ({
    sha: p.sha,
    repo: p.repo,
    message: p.message ?? `Push to ${p.repo}`,
    url: p.url,
    date: p.date,
  }));

  eventsCache.set(key, { value: out, expiresAt: now + TTL_MS });
  return out;
}
