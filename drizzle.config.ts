import type { Config } from "drizzle-kit";

/**
 * drizzle-kit uses this for `db:push`. Precedence:
 *  - DATABASE_URL set → Turso / libsql remote
 *  - otherwise a local `file:data/coach.db`
 */
const url = process.env.DATABASE_URL ?? "file:./data/coach.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: url.startsWith("libsql:") || url.startsWith("http") ? "turso" : "sqlite",
  dbCredentials: authToken ? { url, authToken } : { url },
  strict: false,
  verbose: false,
} satisfies Config;
