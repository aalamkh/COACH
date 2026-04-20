# coach

Private, local-first 14-week build program. Single user, no auth. Scaffold (Prompt 1) — schema, seed, and a read-only `/plan` page. Submissions, lessons, and the dashboard ship in later prompts.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript strict
- Tailwind + hand-rolled shadcn-style primitives
- Drizzle ORM · better-sqlite3 · SQLite at `data/coach.db`
- react-markdown + remark-gfm
- Server Actions only (no API routes), Zod for every input

## Setup

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm db:push    # creates data/coach.db from src/db/schema.ts
pnpm db:seed    # seeds all 98 tasks; week 1 day 1 = available, rest = locked
pnpm dev        # http://localhost:3000
```

That's it — no env vars needed for this prompt.

## What's here

- **`/`** — placeholder. "Week 1 · Day 1" + link to `/plan`. Real dashboard comes in Prompt 8.
- **`/plan`** — 14 weeks as collapsible accordions. Click any task row to inline-expand its description and success criteria (rendered markdown). Status dots: gray=locked, blue=available, amber=in-progress, green=passed. Read-only — no submission UI yet.

## Schema

| Table | Used | Purpose |
| --- | --- | --- |
| `tasks` | yes | id, week (1–14), day (1–7), title, description_md, success_criteria_md, submission_type, estimated_hours, prerequisites |
| `progress` | yes | task_id unique FK, status, started_at, passed_at |
| `submissions` | defined | id, task_id, submitted_at, content, feedback_md, grade, specific_issues, token_cost |
| `lessons` | defined | id, task_id unique FK, concepts_md, worked_example_md, diagram_mermaid, generated_at, token_cost |
| `quiz_questions` | defined | id, lesson_id FK, question, options, correct_index, explanation_md |
| `quiz_attempts` | defined | id, question_id FK, answered_at, selected_index, correct |
| `notes` | defined | id, task_id nullable, created_at, body_md |

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit`, strict mode |
| `pnpm db:push` | Push schema to `data/coach.db` (no migration files needed) |
| `pnpm db:seed` | Wipe + reseed 98 tasks |
| `pnpm db:studio` | Open Drizzle Studio |

## Layout

```
src/
  app/
    page.tsx          # /  (placeholder)
    plan/page.tsx     # /plan
    layout.tsx
    globals.css
  components/
    ui/               # Button, Card, Input, Textarea, Label
    markdown.tsx      # react-markdown + remark-gfm
    status-dot.tsx
  db/
    client.ts schema.ts seed.ts seed-data.ts
  lib/
    utils.ts
data/coach.db         # local SQLite (gitignored)
```

## Constraints honoured

- Server Actions only — no `/api` routes, no client fetch to internal endpoints.
- Zod for every Server Action input (none yet — none added in this prompt).
- `react-markdown` + `remark-gfm` for rendering. No other UI libs. No state libs.
