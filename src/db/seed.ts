import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { progress, tasks } from "./schema";
import { SEED_TASKS } from "./seed-data";
import { AI_TRACK } from "./ai-track-data";

function url(): { url: string; authToken?: string } {
  const remote = process.env.DATABASE_URL;
  if (remote && remote.length > 0) {
    return { url: remote, authToken: process.env.DATABASE_AUTH_TOKEN };
  }
  const dbPath = resolve(process.cwd(), "data/coach.db");
  mkdirSync(dirname(dbPath), { recursive: true });
  return { url: `file:${dbPath}` };
}

async function main() {
  const client = createClient(url());
  const db = drizzle(client);

  // Wipe + reseed (idempotent) — order matters because of FK constraints.
  await client.batch(
    [
      "DELETE FROM quiz_attempts;",
      "DELETE FROM quiz_questions;",
      "DELETE FROM lessons;",
      "DELETE FROM submissions;",
      "DELETE FROM notes;",
      "DELETE FROM retros;",
      "DELETE FROM briefings;",
      "DELETE FROM status_lines;",
      "DELETE FROM unblock_suggestions;",
      "DELETE FROM progress;",
      "DELETE FROM tasks;",
    ],
    "write",
  );

  const inserted: { id: number; week: number; day: number }[] = [];

  for (const t of [...SEED_TASKS].sort((a, b) => a.week - b.week || a.day - b.day)) {
    const row = await db
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

  for (let i = 1; i < inserted.length; i++) {
    const cur = inserted[i]!;
    const prev = inserted[i - 1]!;
    await db
      .update(tasks)
      .set({ prerequisites: [prev.id] })
      .where(eq(tasks.id, cur.id))
      .run();
  }

  const first = inserted[0]!;
  const rest = inserted.slice(1);

  await db.insert(progress).values({ taskId: first.id, status: "available" }).run();
  if (rest.length > 0) {
    await db
      .insert(progress)
      .values(rest.map((r) => ({ taskId: r.id, status: "locked" as const })))
      .run();
  }

  for (const t of AI_TRACK) {
    const row = await db
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
    await db.insert(progress).values({ taskId: row.id, status: "available" }).run();
  }

  const taskCountRs = await client.execute("SELECT COUNT(*) AS c FROM tasks");
  const progressCountRs = await client.execute("SELECT COUNT(*) AS c FROM progress");
  const availableCountRs = await client.execute(
    "SELECT COUNT(*) AS c FROM progress WHERE status = 'available'",
  );
  const aiTrackCountRs = await client.execute("SELECT COUNT(*) AS c FROM tasks WHERE week = 0");

  const n = (rs: { rows: unknown[] }) => {
    const row = rs.rows[0] as { c?: number } | undefined;
    return Number(row?.c ?? 0);
  };

  console.log(
    `Seeded ${n(taskCountRs)} tasks (${n(aiTrackCountRs)} AI track), ${n(progressCountRs)} progress rows, ${n(availableCountRs)} available.`,
  );

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
