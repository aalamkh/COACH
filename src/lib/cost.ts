import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { lessons, submissions, tasks } from "@/db/schema";
import { estimateUsd } from "./pricing";

export interface ModelRow {
  model: string | null;
  label: string;
  tokens: number;
  usd: number;
}

export interface TopTaskRow {
  taskId: number;
  week: number;
  day: number;
  title: string;
  tokens: number;
  usd: number;
}

export interface CostStats {
  weekTokens: number;
  weekUsd: number;
  allTimeTokens: number;
  allTimeUsd: number;
  tasksWithSpend: number;
  avgPerTaskTokens: number;
  avgPerTaskUsd: number;
  byModel: ModelRow[];
  topTasks: TopTaskRow[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function loadCostStats(): CostStats {
  const subs = db
    .select({
      model: submissions.model,
      tokenCost: submissions.tokenCost,
      taskId: submissions.taskId,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .all();

  const lns = db
    .select({
      model: lessons.model,
      tokenCost: lessons.tokenCost,
      taskId: lessons.taskId,
      generatedAt: lessons.generatedAt,
    })
    .from(lessons)
    .all();

  const now = Date.now();
  const cutoff = now - WEEK_MS;

  interface Row {
    model: string | null;
    tokens: number;
    taskId: number | null;
    at: number;
  }
  const all: Row[] = [
    ...subs.map((s) => ({
      model: s.model,
      tokens: s.tokenCost ?? 0,
      taskId: s.taskId,
      at: s.submittedAt.getTime(),
    })),
    ...lns.map((l) => ({
      model: l.model,
      tokens: l.tokenCost ?? 0,
      taskId: l.taskId,
      at: l.generatedAt.getTime(),
    })),
  ];

  let weekTokens = 0;
  let weekUsd = 0;
  let allTimeTokens = 0;
  let allTimeUsd = 0;
  const byModel = new Map<string, { tokens: number; usd: number }>();
  const byTask = new Map<number, { tokens: number; usd: number }>();

  for (const r of all) {
    const usd = estimateUsd(r.tokens, r.model);
    allTimeTokens += r.tokens;
    allTimeUsd += usd;
    if (r.at >= cutoff) {
      weekTokens += r.tokens;
      weekUsd += usd;
    }
    const modelKey = r.model ?? "unknown";
    const m = byModel.get(modelKey) ?? { tokens: 0, usd: 0 };
    m.tokens += r.tokens;
    m.usd += usd;
    byModel.set(modelKey, m);

    if (r.taskId != null) {
      const t = byTask.get(r.taskId) ?? { tokens: 0, usd: 0 };
      t.tokens += r.tokens;
      t.usd += usd;
      byTask.set(r.taskId, t);
    }
  }

  const tasksWithSpend = byTask.size;
  const avgPerTaskTokens = tasksWithSpend === 0 ? 0 : Math.round(allTimeTokens / tasksWithSpend);
  const avgPerTaskUsd = tasksWithSpend === 0 ? 0 : allTimeUsd / tasksWithSpend;

  const byModelRows: ModelRow[] = Array.from(byModel.entries())
    .map(([model, v]) => ({
      model: model === "unknown" ? null : model,
      label:
        model === "claude-opus-4-7"
          ? "Opus"
          : model === "claude-sonnet-4-6"
            ? "Sonnet"
            : model === "claude-haiku-4-5-20251001"
              ? "Haiku"
              : model,
      tokens: v.tokens,
      usd: v.usd,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  // Top 5 tasks
  const topTaskIds = Array.from(byTask.entries())
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .slice(0, 5)
    .map(([id]) => id);

  let topTasks: TopTaskRow[] = [];
  if (topTaskIds.length > 0) {
    const titles = db
      .select({ id: tasks.id, title: tasks.title, week: tasks.week, day: tasks.day })
      .from(tasks)
      .where(inArray(tasks.id, topTaskIds))
      .all();
    const titleById = new Map(titles.map((t) => [t.id, t]));
    topTasks = topTaskIds.map((id) => {
      const t = titleById.get(id);
      const v = byTask.get(id)!;
      return {
        taskId: id,
        week: t?.week ?? 0,
        day: t?.day ?? 0,
        title: t?.title ?? `Task ${id}`,
        tokens: v.tokens,
        usd: v.usd,
      };
    });
  }

  return {
    weekTokens,
    weekUsd,
    allTimeTokens,
    allTimeUsd,
    tasksWithSpend,
    avgPerTaskTokens,
    avgPerTaskUsd,
    byModel: byModelRows,
    topTasks,
  };
}
