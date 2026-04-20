import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

/**
 * Connection precedence:
 *  1. `DATABASE_URL` (and optional `DATABASE_AUTH_TOKEN`) — Turso / libsql remote.
 *  2. Local SQLite file at `data/coach.db` via libsql's `file:` URL.
 */
function connectionConfig(): { url: string; authToken?: string } {
  const remote = process.env.DATABASE_URL;
  if (remote && remote.length > 0) {
    return { url: remote, authToken: process.env.DATABASE_AUTH_TOKEN };
  }
  const dbPath = resolve(process.cwd(), "data/coach.db");
  try {
    mkdirSync(dirname(dbPath), { recursive: true });
  } catch {
    /* read-only or already exists — ignore */
  }
  return { url: `file:${dbPath}` };
}

// Survive HMR: bind the client to globalThis so we don't open thousands of
// connections in dev.
const globalForDb = globalThis as unknown as {
  __coachLibsqlClient?: ReturnType<typeof createClient>;
  __coachDrizzle?: ReturnType<typeof drizzle<typeof schema>>;
};

export const libsql =
  globalForDb.__coachLibsqlClient ?? createClient(connectionConfig());
if (!globalForDb.__coachLibsqlClient) globalForDb.__coachLibsqlClient = libsql;

export const db =
  globalForDb.__coachDrizzle ?? drizzle(libsql, { schema });
if (!globalForDb.__coachDrizzle) globalForDb.__coachDrizzle = db;

export { schema };
