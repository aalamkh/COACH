# coach

Private, single-user 14-week build program with AI grading, lessons, quizzes, daily briefings, and a weekly retro. Password-gated.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript strict
- Tailwind + hand-rolled shadcn-style primitives
- Drizzle ORM · `@libsql/client` (SQLite local / Turso remote)
- Anthropic SDK (tool-forced JSON grading, prompt caching)
- react-markdown + remark-gfm + shiki · mermaid
- Server Actions only (no API routes), Zod on every input

## Local setup

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm db:push          # creates data/coach.db from src/db/schema.ts
pnpm db:seed          # 98 tasks + 24 AI-track lessons
pnpm dev              # http://localhost:3000  (password: 12345)
```

Optional local env (`.env.local`):

```
ANTHROPIC_API_KEY=sk-ant-...
COACH_PASSWORD=your-password    # defaults to 12345 if unset
```

`ANTHROPIC_API_KEY` can also be set in-app at `/settings` — it's stored in the DB `settings` row. Env vars always win over DB values.

## Deploy to Netlify + Turso

The app uses `@libsql/client`, which talks to either a local SQLite file or a remote Turso database. Netlify's serverless runtime has an ephemeral filesystem, so production needs Turso.

### 1. Provision Turso

```bash
# install CLI (macOS): brew install tursodatabase/tap/turso
turso auth signup
turso db create coach
turso db show coach --url         # → libsql://coach-<org>.turso.io
turso db tokens create coach      # → long JWT
```

### 2. Seed Turso once

From your laptop, with the URL + token exported:

```bash
DATABASE_URL="libsql://coach-<org>.turso.io" \
DATABASE_AUTH_TOKEN="<token>" \
pnpm db:push

DATABASE_URL="libsql://coach-<org>.turso.io" \
DATABASE_AUTH_TOKEN="<token>" \
pnpm db:seed
```

### 3. Netlify env vars

In Netlify → Site → **Site configuration → Environment variables**, add:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `libsql://coach-<org>.turso.io` |
| `DATABASE_AUTH_TOKEN` | Turso JWT from step 1 |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `COACH_PASSWORD` | your login password |

### 4. Deploy

`netlify.toml` already wires up the build (`pnpm install && pnpm db:push && pnpm build`) and the Next.js plugin. Push to your default branch and Netlify will rebuild.

First visit → `/login` → enter `COACH_PASSWORD` → `coach_auth` cookie set (30-day).

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit`, strict mode |
| `pnpm db:push` | Push schema to local file **or** `DATABASE_URL` if set |
| `pnpm db:seed` | Wipe + reseed tasks (same URL resolution as `db:push`) |
| `pnpm db:studio` | Open Drizzle Studio |

## Routes

- `/` — dashboard: today's tasks, briefing, status line, stuck banner, momentum pill
- `/plan` — 14 weeks of tasks, collapsible
- `/ai-track` — 24 AI-concept lessons (week 0)
- `/task/[id]` — Task / History / Lesson tabs, submit + grade, resubmit diff, notes, quiz
- `/retros` + `/retro/[week]` — weekly retros
- `/notes` — all notes across tasks
- `/settings` — API key, coaching tone, daily hours, snooze controls
- `/login` — password gate

## Layout

```
src/
  app/           routes (all Server Components, Server Actions in actions.ts)
  components/    ui/ primitives + feature cards
  db/            schema.ts, client.ts, seed.ts, seed-data.ts, ai-track-data.ts
  lib/           briefing, status, retro, quiz, cost, unblock, next-action, env
  middleware.ts  password gate
netlify.toml
drizzle.config.ts
```

## Constraints

- Server Actions only — no `/api` routes.
- Zod for every Server Action input.
- No client-side state libraries. No UI component libraries.
- Env vars override DB settings; DB settings override defaults.
