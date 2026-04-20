import "server-only";
import { loadShippedThisWeek, renderShippedParagraph } from "@/lib/status";

export function ShippedThisWeek() {
  const data = loadShippedThisWeek();
  const paragraph = renderShippedParagraph(data);
  const empty = !paragraph;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">Shipped this week</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {empty
          ? "Nothing's been marked passed this week yet. That's fine some weeks — come back here when you're ready to submit."
          : paragraph}
      </p>
    </section>
  );
}
