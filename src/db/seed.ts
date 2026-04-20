import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { progress, tasks } from "./schema";
import { SEED_TASKS } from "./seed-data";
import { AI_TRACK } from "./ai-track-data";

const dbPath = resolve(process.cwd(), "data/coach.db");
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

// Idempotent: clear and reseed.
sqlite.exec(
  "DELETE FROM quiz_attempts; DELETE FROM quiz_questions; DELETE FROM lessons; DELETE FROM submissions; DELETE FROM notes; DELETE FROM progress; DELETE FROM tasks;",
);

// Insert tasks in week/day order so ids climb monotonically; that lets us wire
// prerequisites = previous task id.
const inserted: { id: number; week: number; day: number }[] = [];

for (const t of [...SEED_TASKS].sort((a, b) => a.week - b.week || a.day - b.day)) {
  const row = db
    .insert(tasks)
    .values({
      week: t.week,
      day: t.day,
      title: t.title,
      descriptionMd: t.descriptionMd,
      successCriteriaMd: t.successCriteriaMd,
      submissionType: t.submissionType,
      estimatedHours: t.estimatedHours,
      prerequisites: [],
    })
    .returning({ id: tasks.id })
    .get();
  inserted.push({ id: row.id, week: t.week, day: t.day });
}

// Wire prerequisites: each task depends on the one before it (linear chain).
for (let i = 1; i < inserted.length; i++) {
  const cur = inserted[i]!;
  const prev = inserted[i - 1]!;
  db.update(tasks).set({ prerequisites: [prev.id] }).where(eq(tasks.id, cur.id)).run();
}

// Initialize progress: week 1 day 1 = available; everything else = locked.
const first = inserted[0]!;
const rest = inserted.slice(1);

db.insert(progress).values({ taskId: first.id, status: "available" }).run();
if (rest.length > 0) {
  db.insert(progress)
    .values(rest.map((r) => ({ taskId: r.id, status: "locked" as const })))
    .run();
}

// ───────── AI track (week = 0, all available, no unlock chain) ─────────
for (const t of AI_TRACK) {
  const row = db
    .insert(tasks)
    .values({
      week: 0,
      day: t.day,
      title: t.title,
      descriptionMd: t.descriptionMd,
      successCriteriaMd: t.successCriteriaMd,
      submissionType: t.submissionType,
      estimatedHours: t.estimatedHours,
      prerequisites: [],
    })
    .returning({ id: tasks.id })
    .get();
  db.insert(progress).values({ taskId: row.id, status: "available" }).run();
}

const taskCount = sqlite.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number };
const progressCount = sqlite.prepare("SELECT COUNT(*) AS c FROM progress").get() as { c: number };
const availableCount = sqlite
  .prepare("SELECT COUNT(*) AS c FROM progress WHERE status = 'available'")
  .get() as { c: number };
const aiTrackCount = sqlite
  .prepare("SELECT COUNT(*) AS c FROM tasks WHERE week = 0")
  .get() as { c: number };

console.log(
  `Seeded ${taskCount.c} tasks (${aiTrackCount.c} AI track), ${progressCount.c} progress rows, ${availableCount.c} available.`,
);

sqlite.close();
