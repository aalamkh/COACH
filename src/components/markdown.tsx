import "server-only";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { createHighlighter, type Highlighter } from "shiki";
import { cn } from "@/lib/utils";

let cached: Promise<Highlighter> | null = null;
function getHighlighter() {
  if (!cached) {
    cached = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [
        "bash",
        "diff",
        "json",
        "markdown",
        "sql",
        "typescript",
        "tsx",
        "javascript",
        "jsx",
        "yaml",
      ],
    });
  }
  return cached;
}

export async function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const highlighter = await getHighlighter();
  return (
    <div className={cn("markdown text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypeShikiFromHighlighter,
            highlighter,
            {
              themes: { light: "github-light", dark: "github-dark" },
              defaultColor: false,
            },
          ],
        ]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
