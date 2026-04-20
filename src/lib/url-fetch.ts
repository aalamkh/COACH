import "server-only";

export class UrlFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlFetchError";
  }
}

const MAX_TEXT_CHARS = 6000;
const TIMEOUT_MS = 10_000;

export interface UrlPage {
  url: string;
  text: string;
  truncated: boolean;
}

export async function fetchUrlText(url: string): Promise<UrlPage> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UrlFetchError("Not a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlFetchError("URL must use http or https.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "coach-local",
        Accept: "text/html,application/xhtml+xml,text/plain,*/*",
      },
      redirect: "follow",
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new UrlFetchError("URL fetch timed out after 10s.");
    }
    throw new UrlFetchError("Couldn't reach that URL.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new UrlFetchError(`Couldn't reach that URL (HTTP ${res.status}).`);
  }

  const raw = await res.text();
  const text = stripHtml(raw);
  const truncated = text.length > MAX_TEXT_CHARS;
  return {
    url: parsed.toString(),
    text: truncated ? text.slice(0, MAX_TEXT_CHARS) + "…[truncated]" : text,
    truncated,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
