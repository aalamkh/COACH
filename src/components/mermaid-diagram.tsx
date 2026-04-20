"use client";

import { useEffect, useRef, useState } from "react";

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  return mermaidPromise;
}

function isDarkNow(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.classList.contains("dark")) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function MermaidDiagram({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  // Initialize + watch theme.
  useEffect(() => {
    setDark(isDarkNow());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(isDarkNow());
    mq.addEventListener("change", onChange);
    // Also watch the .dark class on <html> in case the app toggles it.
    const obs = new MutationObserver(() => setDark(isDarkNow()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mq.removeEventListener("change", onChange);
      obs.disconnect();
    };
  }, []);

  // Render whenever source or theme changes.
  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? "dark" : "default",
          securityLevel: "strict",
          fontFamily: "inherit",
        });
        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, source);
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [source, dark]);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Couldn't render the diagram (invalid mermaid syntax). Showing the source:
        </p>
        <pre className="overflow-x-auto rounded border border-border bg-muted/30 p-3 text-xs">
          <code>{source}</code>
        </pre>
      </div>
    );
  }

  return <div ref={ref} className="overflow-x-auto" />;
}
