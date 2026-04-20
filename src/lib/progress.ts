import "server-only";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { progress, tasks, type Status, type SubmissionType } from "@/db/schema";

/**
 * Mark a task passed and unlock the next sequential task (same week next day,
 * or week+1 day 1 if this is day 7). Idempotent. AI track tasks (week=0) only
 * get the pass — no unlock cascade since the whole track is open from start.
 */
export async function markPassedAndUnlockNext(taskId: number) {
  const cur = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!cur) return;

  const now = new Date();
  await db
    .update(progress)
    .set({ status: "passed", passedAt: now })
    .where(eq(progress.taskId, taskId))
    .run();

  if (cur.week === 0) return;

  const nextWeek = cur.day === 7 ? cur.week + 1 : cur.week;
  const nextDay = cur.day === 7 ? 1 : cur.day + 1;

  const nextTask = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.week, nextWeek), eq(tasks.day, nextDay)))
    .get();
  if (!nextTask) return;

  const nextProgress = await db
    .select({ status: progress.status })
    .from(progress)
    .where(eq(progress.taskId, nextTask.id))
    .get();
  if (nextProgress && nextProgress.status === "locked") {
    await db
      .update(progress)
      .set({ status: "available" })
      .where(eq(progress.taskId, nextTask.id))
      .run();
  }
}

export interface CurrentPointer {
  week: number;
  day: number;
}

/** Lowest (week, day) among tasks that are 'available' or 'in_progress'. Excludes the week=0 AI track. */
export async function currentPointer(): Promise<CurrentPointer | null> {
  const row = await db
    .select({ week: tasks.week, day: tasks.day })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(and(inArray(progress.status, ["available", "in_progress"]), gt(tasks.week, 0)))
    .orderBy(asc(tasks.week), asc(tasks.day))
    .limit(1)
    .get();
  return row ? { week: row.week, day: row.day } : null;
}

export interface ProgressSummary {
  passed: number;
  total: number;
  pct: number;
}

export async function progressSummary(): Promise<ProgressSummary> {
  const rows = await db
    .select({ status: progress.status })
    .from(progress)
    .innerJoin(tasks, eq(tasks.id, progress.taskId))
    .where(gt(tasks.week, 0))
    .all();
  const total = rows.length;
  const passed = rows.filter((r) => r.status === "passed").length;
  return { passed, total, pct: total === 0 ? 0 : Math.round((passed / total) * 100) };
}

export interface TodayTask {
  id: number;
  week: number;
  day: number;
  title: string;
  submissionType: SubmissionType;
  estimatedHours: number;
  status: Status;
}

/** All tasks currently 'available' or 'in_progress', excluding snoozed and the week=0 AI track. */
export async function todaysTasks(): Promise<TodayTask[]> {
  const now = new Date();
  return (await db
    .select({
      id: tasks.id,
      week: tasks.week,
      day: tasks.day,
      title: tasks.title,
      submissionType: tasks.submissionType,
      estimatedHours: tasks.estimatedHours,
      status: progress.status,
    })
    .from(tasks)
    .innerJoin(progress, eq(progress.taskId, tasks.id))
    .where(
      and(
        inArray(progress.status, ["available", "in_progress"]),
        gt(tasks.week, 0),
        or(
          isNull(progress.snoozedUntil),
          sql`${progress.snoozedUntil} <= ${Math.floor(now.getTime() / 1000)}`,
        ),
      ),
    )
    .orderBy(asc(tasks.week), asc(tasks.day))
    .all()) as TodayTask[];
}

/** Flip 'available' → 'in_progress' and stamp started_at on first submission. */
export async function touchStarted(taskId: number) {
  const row = await db.select().from(progress).where(eq(progress.taskId, taskId)).get();
  if (!row) return;
  if (row.status === "passed") return;
  const patch: Partial<typeof progress.$inferInsert> = {};
  if (row.status === "available" || row.status === "locked") patch.status = "in_progress";
  if (!row.startedAt) patch.startedAt = new Date();
  if (Object.keys(patch).length > 0) {
    await db.update(progress).set(patch).where(eq(progress.taskId, taskId)).run();
  }
}
