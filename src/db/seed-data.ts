import type { SubmissionType } from "./schema";

export interface SeedTask {
  week: number;
  day: number;
  title: string;
  descriptionMd: string;
  successCriteriaMd: string;
  submissionType: SubmissionType;
  estimatedHours: number;
}

// 14 weeks × 7 days = 98 tasks. Path: mid-frontend dev → full-stack + AI product
// builder shipping a paid niche product. Branched paths in W11–W14 (scale / pivot /
// retry) live inside each task description; you do whichever your W11D1 decision
// dictates and answer under that header.
export const SEED_TASKS: readonly SeedTask[] = [
  // ───────── Week 1 — niche pick + freelance bridge + landing ─────────
  {
    week: 1,
    day: 1,
    title: "Niche decision with reasoning",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Pick the niche you'll build the MVP for. The niche must be specific enough to name 5 target users by company today.

Answer all four:

1. **3 candidate niches**, each with: who the buyer is (title + company size), what they currently spend on this problem, and one specific person you already know in the space (name + company).
2. **Winning niche** in one sentence.
3. **150-word defense**: why this niche, why now, why you.
4. **First 5 target users by name + company** (no "ideal customer profile" generalities — actual humans).`,
    successCriteriaMd: `- [ ] 3 candidate niches with all 3 sub-fields each.
- [ ] One winning niche named explicitly.
- [ ] 150-word defense (count the words).
- [ ] 5 target users with first name + company.`,
  },
  {
    week: 1,
    day: 2,
    title: "5 named discovery-call DMs sent",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Send 5 cold DMs asking for a 15-minute discovery call. Each DM must reference something specific about the recipient (a post, a launch, a job change).

Paste below:

1. Recipient name + company + link to their profile (LinkedIn, X, etc.).
2. The DM you sent, verbatim.
3. The platform.
4. The reply (or "no reply yet").`,
    successCriteriaMd: `- [ ] 5 entries, each with name + company + link.
- [ ] Each DM references a specific post/launch/event for that person.
- [ ] No "I hope this finds you well" or generic openers.
- [ ] Each DM ends with a clear ask: 15-min call.`,
  },
  {
    week: 1,
    day: 3,
    title: "Upwork profile published",
    submissionType: "url",
    estimatedHours: 3,
    descriptionMd: `Publish a 100% complete Upwork profile targeting your niche.

- Headline: \`<role> for <niche>\` (e.g. "Next.js engineer for B2B SaaS onboarding").
- Overview: 3 paragraphs — problem, proof, how to hire.
- Portfolio: 5+ items with screenshots and 2-sentence captions.
- Rate: a single $/hr number, not a range.
- Skills: 10 specific stack tags (no "Web Development").

Submit the public profile URL.`,
    successCriteriaMd: `- [ ] URL is public and 100% complete (Upwork shows the green badge).
- [ ] Headline contains a role AND a niche.
- [ ] 5+ portfolio items with screenshots.
- [ ] Rate is one explicit number.
- [ ] No skill tag is generic ("Web Development", "Programming").`,
  },
  {
    week: 1,
    day: 4,
    title: "Contra profile published",
    submissionType: "url",
    estimatedHours: 2,
    descriptionMd: `Publish a Contra profile that mirrors the Upwork positioning. Contra is trust-based, so emphasize fixed packages and proof.

- 2–3 fixed-scope service packages with price and timeline.
- 2 case studies with named outcomes.
- Availability line: "1 slot open, starts <date>".

Submit the public profile URL.`,
    successCriteriaMd: `- [ ] 2+ service packages each with a price and a timeline.
- [ ] 2+ case studies, each with a named outcome (not just "built a website").
- [ ] Availability line gives a specific start date.`,
  },
  {
    week: 1,
    day: 5,
    title: "Pinned LinkedIn post about what I'm building",
    submissionType: "url",
    estimatedHours: 1,
    descriptionMd: `Publish a LinkedIn post stating publicly what you're building, for whom, and the deadline. Pin it to your profile.

The post must include:

1. Who it's for (your niche, in plain words).
2. The problem you're solving.
3. The deadline (a specific date).
4. One sentence on why you.

Submit the post URL.`,
    successCriteriaMd: `- [ ] Post is public on LinkedIn and currently pinned to your profile.
- [ ] Post body names a specific date.
- [ ] Post body names the niche/audience explicitly.
- [ ] Word count between 80 and 250.`,
  },
  {
    week: 1,
    day: 6,
    title: "Next.js 15 landing page deployed to Vercel",
    submissionType: "url",
    estimatedHours: 4,
    descriptionMd: `Deploy a Next.js 15 (App Router) landing page for the product you're building. Stack: Next.js 15, TypeScript, Tailwind, shadcn. Deploy to Vercel.

Required sections:

- Hero: headline + sub + primary CTA (email capture or "book a call").
- 2–3 feature blocks with icons.
- A single testimonial slot (placeholder OK).
- Footer with privacy + terms links (stubs OK).

Submit the production Vercel URL.`,
    successCriteriaMd: `- [ ] URL loads on the production Vercel domain.
- [ ] App Router (no \`pages/\` directory in the source).
- [ ] Email capture or "book a call" button is present in the hero.
- [ ] Lighthouse Performance ≥ 90 on the homepage.
- [ ] Privacy and Terms links exist (any working stubs).`,
  },
  {
    week: 1,
    day: 7,
    title: "5 discovery calls completed with structured notes",
    submissionType: "text_answer",
    estimatedHours: 5,
    descriptionMd: `Complete 5 discovery calls. For each, capture structured notes.

Per call paste:

1. Name + company + role.
2. Date of call.
3. Their current workflow for the problem (1–3 sentences).
4. The single biggest pain they named (one sentence).
5. What they currently pay for adjacent tools.
6. Would they try a beta? Yes / No / Maybe + their condition.`,
    successCriteriaMd: `- [ ] 5 calls, each with all 6 fields filled in.
- [ ] Dates are real (within the last 7 days).
- [ ] At least 3 named pains are non-overlapping.
- [ ] At least 2 dollar amounts cited for adjacent tools.`,
  },

  // ───────── Week 2 — foundation infra ─────────
  {
    week: 2,
    day: 1,
    title: "Drizzle schema (users, teams, projects, sprints, tickets) + seed",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Add Drizzle ORM and define a foundation schema with five tables: \`users\`, \`teams\`, \`projects\`, \`sprints\`, \`tickets\`. Wire up Neon Postgres or local SQLite.

Required files:

- \`drizzle.config.ts\` reading credentials from env.
- \`src/db/schema.ts\` with all 5 tables and FK relations.
- \`src/db/client.ts\` exporting a singleton.
- \`src/db/seed.ts\` that inserts: 1 user, 2 teams, 5 projects across teams, 3 sprints per project, 12 tickets distributed across sprints.
- Scripts: \`db:push\`, \`db:seed\`.

Submit the commit URL containing all of the above.`,
    successCriteriaMd: `- [ ] Commit diff includes \`schema.ts\` with all 5 named tables.
- [ ] Foreign keys: ticket → sprint → project → team; user → team via membership.
- [ ] \`pnpm db:seed\` produces 1 user, 2 teams, 5 projects, 9 sprints (3×3), 12 tickets.
- [ ] No raw SQL strings in the seed — Drizzle queries only.
- [ ] At least one timestamp column (\`created_at\`) on every table.`,
  },
  {
    week: 2,
    day: 2,
    title: "Clerk auth + webhook upserting users",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Integrate Clerk. Implement sign-in / sign-up / sign-out and a webhook at \`/api/webhooks/clerk\` that upserts \`users\` rows on \`user.created\` and \`user.updated\`, and deletes on \`user.deleted\`. Verify the Svix signature.

The webhook is the **only** API route in the project. Everything else uses Server Actions.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] \`middleware.ts\` is committed and gates a \`/dashboard\` route.
- [ ] Webhook file verifies Svix signature; rejects with 401 on mismatch.
- [ ] \`user.created\` upserts a row in the \`users\` table.
- [ ] \`user.deleted\` removes the row.
- [ ] No Clerk secret keys appear in the client bundle (search the diff).`,
  },
  {
    week: 2,
    day: 3,
    title: "Server Actions + Zod + authorization test",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Build create / update / delete Server Actions for \`tickets\` with Zod validation on every input. Add an authorization check: a user can only mutate tickets that belong to a project on a team they're a member of.

Then add **one integration test** that proves a user from Team A cannot delete a ticket on Team B.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] All three actions live in a file with \`"use server"\` at the top.
- [ ] Each action passes input through a Zod schema before any DB call.
- [ ] Each action runs an authorization check before mutation.
- [ ] An integration test exists and asserts the cross-team delete is rejected.
- [ ] CI or local test runner shows the test passing.`,
  },
  {
    week: 2,
    day: 4,
    title: "shadcn CRUD with loading / empty / error + mobile + dark mode",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Ship a CRUD UI for tickets using shadcn primitives. The list and detail views must each handle loading, empty, and error states explicitly. Layout works at 360px width. Dark mode toggles via cookie (no state lib).

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Loading state uses the shadcn Skeleton (visible if you throttle the network).
- [ ] Empty state has a CTA, not just "no data".
- [ ] Error state shows a recoverable message + retry.
- [ ] Layout does not horizontal-scroll at 360px width.
- [ ] Dark-mode preference survives a hard reload (cookie, not localStorage).`,
  },
  {
    week: 2,
    day: 5,
    title: "Production deploy with Sentry + analytics + privacy/terms",
    submissionType: "url",
    estimatedHours: 3,
    descriptionMd: `Deploy the foundation app to Vercel production with: Sentry for client + server error capture, one product-analytics tool (PostHog / Vercel / Plausible) firing at minimum a \`signed_up\` event, and real Privacy Policy + Terms pages (not lorem ipsum).

Submit the production URL.`,
    successCriteriaMd: `- [ ] URL loads in production with HTTPS.
- [ ] Hitting \`/_sentry-test\` (or a deliberate throw) shows up in your Sentry dashboard.
- [ ] Analytics dashboard shows at least 1 \`signed_up\` event from prod in the last 24h.
- [ ] \`/privacy\` and \`/terms\` are real, niche-appropriate text (≥ 200 words each).
- [ ] No secrets visible in the client JS (devtools → sources spot check).`,
  },
  {
    week: 2,
    day: 6,
    title: "README + Loom + unpin tutorial repos",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Write a README a stranger could use, record a 4-minute Loom of the foundation, and clean up your GitHub presence.

Paste below:

1. Loom URL (public).
2. Link to the foundation repo with the updated README.
3. Confirmation you unpinned every tutorial / course / clone repo from your GitHub profile (paste your profile URL).
4. The 3 hardest bugs you hit this week + 1-line diagnosis each.`,
    successCriteriaMd: `- [ ] Loom URL is public and ≤ 5 minutes.
- [ ] README has Prereqs → Install → Env → Run → Deploy sections in that order.
- [ ] GitHub profile shows zero pinned tutorial / clone repos (visit the URL and confirm).
- [ ] 3 bugs named with one-line diagnosis each.`,
  },
  {
    week: 2,
    day: 7,
    title: "Foundation retro + MVP scope decision",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Decide MVP scope before week 3 begins. Answer:

1. **One-sentence product description** for your niche.
2. **3 features in scope** for weeks 3–6.
3. **1 killer feature** — the AI feature you'll ship Week 3 Day 1.
4. **5 features explicitly NOT in scope** (the not-doing list).
5. **First user by name** who'll get the link first when it ships.`,
    successCriteriaMd: `- [ ] Product description is one sentence (single period at the end).
- [ ] Exactly 3 in-scope features.
- [ ] Exactly 5 not-doing items.
- [ ] Killer feature is AI-driven and named specifically.
- [ ] Named first user with their company.`,
  },

  // ───────── Week 3 — MVP: AI feature first, then domain ─────────
  {
    week: 3,
    day: 1,
    title: "First AI feature via Anthropic",
    submissionType: "github_commit",
    estimatedHours: 5,
    descriptionMd: `Ship the killer AI feature end-to-end using \`@anthropic-ai/sdk\`. Server Action calls the Anthropic API; UI streams output to the user.

Required:

- Prompt lives in \`prompts/<feature>-v1.ts\` (versioned, not inlined in the action).
- Model + max_tokens + temperature are explicit in the call.
- Token usage is persisted per call (user_id, tokens_in, tokens_out, ms).
- UI streams (user can see tokens arriving).

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Feature works end-to-end on a fresh sign-up.
- [ ] Prompt is imported from a \`prompts/\` file, not a string in the Server Action.
- [ ] DB has a usage table; one row written per call.
- [ ] UI streams (no spinner-only experience).
- [ ] Anthropic key is server-only (no key in client bundle — verify in the diff).`,
  },
  {
    week: 3,
    day: 2,
    title: "Domain schema for the niche",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Model the MVP domain in Drizzle. Tables only for the 3 in-scope features — no speculative tables.

Commit must include the migration file and an ASCII or PNG ERD in the PR description.`,
    successCriteriaMd: `- [ ] Schema covers exactly the 3 in-scope features (no extras).
- [ ] Every FK has an explicit ON DELETE rule.
- [ ] \`created_at\` and \`updated_at\` on every table.
- [ ] ERD is in the PR description (ascii block or image).
- [ ] \`pnpm db:push\` runs against a fresh DB without errors.`,
  },
  {
    week: 3,
    day: 3,
    title: "Core CRUD for primary entity",
    submissionType: "github_commit",
    estimatedHours: 5,
    descriptionMd: `Build full CRUD for the MVP's main entity. List + detail + create + edit + delete. All mutations via Server Actions. Each Server Action is Zod-validated and authorization-checked. Loading uses Suspense; empty has a CTA.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] All 5 operations work end-to-end in production.
- [ ] List route streams (Suspense boundary visible under throttled network).
- [ ] Empty state has a CTA, not "no data".
- [ ] Delete prompts for confirmation (modal or inline).
- [ ] No N+1: list query produces ≤ 2 SQL statements.`,
  },
  {
    week: 3,
    day: 4,
    title: "Prompt engineering + eval harness",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Build a tiny eval harness: \`evals/<feature>.json\` with 10 inputs and expected behaviours, plus a \`pnpm eval\` script that runs each input through your prompt and prints pass/fail per case.

Then iterate the prompt to v2 based on at least one failure.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] \`evals/<feature>.json\` exists with 10 inputs.
- [ ] \`pnpm eval\` script runs and prints a pass/fail summary.
- [ ] \`prompts/<feature>-v2.ts\` exists with a changelog comment at the top.
- [ ] PR description shows v1 vs v2 pass rates.
- [ ] At least one new evals case is a known prior failure.`,
  },
  {
    week: 3,
    day: 5,
    title: "RAG: embeddings ingestion pipeline",
    submissionType: "github_commit",
    estimatedHours: 5,
    descriptionMd: `Add embeddings ingestion. Choose pgvector on Neon or sqlite-vec. Pipeline:

1. Source documents (whatever your niche uses — docs, tickets, transcripts).
2. Chunk to ~500 tokens with 50-token overlap.
3. Embed via OpenAI \`text-embedding-3-small\` or Voyage.
4. Persist chunk + vector + metadata.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Vector column or table is in the schema (pgvector or sqlite-vec).
- [ ] Chunker has explicit size + overlap (visible in code).
- [ ] Ingestion is idempotent: re-running on the same input doesn't duplicate.
- [ ] PR description names the embedding model and dimension count.
- [ ] At least 100 chunks ingested in the demo.`,
  },
  {
    week: 3,
    day: 6,
    title: "RAG: retrieval + augmented generation",
    submissionType: "github_commit",
    estimatedHours: 5,
    descriptionMd: `Wire retrieval into the AI feature. Top-K cosine search; pass retrieved chunks into the prompt with citations. UI shows citations the model used.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Top-K is configurable (env or constant), default 4–8.
- [ ] Prompt includes retrieved chunks with stable IDs the UI can cite.
- [ ] UI shows a "sources" list under each answer.
- [ ] At least one eval case verifies the retrieved chunk is correct.
- [ ] Cold-start retrieval latency < 500ms locally (PR notes the number).`,
  },
  {
    week: 3,
    day: 7,
    title: "Weekly retro — week 3",
    submissionType: "text_answer",
    estimatedHours: 1,
    descriptionMd: `Five questions:

1. What shipped this week (list each commit)?
2. What didn't ship that you planned, and why?
3. The single hardest bug + how you fixed it.
4. The biggest open risk for week 4.
5. What you'll cut from week 4 if that risk fires.`,
    successCriteriaMd: `- [ ] Each commit listed with a short line.
- [ ] Slipped items named explicitly (no glossing).
- [ ] Risk is concrete (not "scope" or "time").
- [ ] Pre-decided cut is a real line item.`,
  },

  // ───────── Week 4 — payments + onboarding + polish ─────────
  {
    week: 4,
    day: 1,
    title: "Stripe test mode setup",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Wire Stripe in test mode. Define 2–3 plan tiers in Stripe Dashboard. Add \`/pricing\` page that renders tiers from your DB (not hardcoded). Hook up Customer Portal link from the user dashboard.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Stripe products exist in test mode (PR description includes their IDs).
- [ ] \`/pricing\` reads tier data from DB, not hardcoded.
- [ ] User dashboard links to Stripe Customer Portal.
- [ ] All Stripe keys come from env, not source.
- [ ] Middle tier is visually emphasized.`,
  },
  {
    week: 4,
    day: 2,
    title: "Stripe Checkout + webhook (test mode)",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Wire Stripe Checkout end-to-end in test mode. Webhook at \`/api/webhooks/stripe\` handles \`checkout.session.completed\`, \`customer.subscription.updated\`, \`customer.subscription.deleted\`. Update the user's plan column. Verify webhook signature.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Successful test-card checkout flips the user's plan in the DB.
- [ ] Webhook verifies the signature and rejects on mismatch.
- [ ] Webhook is idempotent: re-delivering the same event doesn't double-flip.
- [ ] Cancellation downgrades the plan at period end.
- [ ] PR description includes Stripe CLI screenshots of the 3 events.`,
  },
  {
    week: 4,
    day: 3,
    title: "Onboarding flow",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `New users land in a 2–3 step onboarding before reaching the dashboard. Persist \`onboarded_at\` so they don't see it twice. Skip path must work and still set \`onboarded_at\`.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Middleware redirects un-onboarded users to /onboarding.
- [ ] Skip button writes \`onboarded_at\`.
- [ ] On revisit after onboarding, no redirect.
- [ ] Layout does not break at 360px width.
- [ ] Each step submits via Server Action (no /api routes added).`,
  },
  {
    week: 4,
    day: 4,
    title: "Error handling + global error boundary",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `App must never show a stack trace to users. Add:

- \`error.tsx\` per route group with friendly copy + retry.
- \`global-error.tsx\` for the outermost crash.
- \`not-found.tsx\`.
- Server Actions return \`{ ok: false, error }\` on user errors; throw only on bugs.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Each route group has an \`error.tsx\`.
- [ ] \`global-error.tsx\` exists and is styled.
- [ ] \`not-found.tsx\` exists and is styled.
- [ ] Forcing an error on the AI feature shows the friendly UI, not a stack.
- [ ] Sentry captures the underlying error (PR shows the Sentry event).`,
  },
  {
    week: 4,
    day: 5,
    title: "Mobile polish + dark mode pass",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Walk through every signed-in route at 360px width and in dark mode. Fix every break and every illegible contrast.

PR description must list each route + a screenshot before/after for any change.`,
    successCriteriaMd: `- [ ] No horizontal scroll on any signed-in route at 360px.
- [ ] All text on dark mode meets WCAG AA contrast.
- [ ] PR description lists every route walked + before/after screenshots for each fix.
- [ ] At least 3 distinct issues fixed.`,
  },
  {
    week: 4,
    day: 6,
    title: "Waitlist page on landing",
    submissionType: "github_commit",
    estimatedHours: 2,
    descriptionMd: `Add a public \`/waitlist\` (or replace landing CTA) that captures email + a 1-line "what would make this useful for you" field. Server Action validates email, stores in \`waitlist\` table, returns confirmation.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] \`waitlist\` table exists in schema.
- [ ] Server Action is Zod-validated.
- [ ] Confirmation page is friendly (not a JSON dump).
- [ ] Duplicate submissions are deduped by email at the DB layer.
- [ ] Page has at least one social-proof element (counter, named users, or quote).`,
  },
  {
    week: 4,
    day: 7,
    title: "Weekly retro — week 4",
    submissionType: "text_answer",
    estimatedHours: 1,
    descriptionMd: `Same five questions as week 3 retro. Be honest about slip.

1. Shipped this week.
2. Slipped + why.
3. Hardest bug + fix.
4. Biggest week-5 risk.
5. Pre-decided cut if the risk fires.`,
    successCriteriaMd: `- [ ] All 5 questions answered.
- [ ] Slip items named explicitly.
- [ ] Risk is concrete (not "scope" or "time").
- [ ] Cut is a real line item.`,
  },

  // ───────── Week 5 — scale + AI hardening + polish ─────────
  {
    week: 5,
    day: 1,
    title: "Rate limiting on AI feature",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Per-user rate limit on the AI feature. Use Upstash Ratelimit, Redis, or a DB-backed counter. Friendly error message when exceeded.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Limit is per user (not per IP).
- [ ] Limit value is in env, not hardcoded.
- [ ] Exceeding shows a friendly message + when limit resets.
- [ ] Bypass is impossible from client (verified by hitting the action directly).
- [ ] PR description includes a manual test demonstrating the limit.`,
  },
  {
    week: 5,
    day: 2,
    title: "Background jobs / queue for AI calls",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Move long-running AI calls to a background queue (Inngest, Trigger.dev, or a SQS+Lambda equivalent). UI shows job status; result lands when ready.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Trigger from UI returns immediately (no spinner > 2s).
- [ ] Job status is queryable (polling or websocket).
- [ ] Result is persisted; refresh shows it.
- [ ] Failure path is wired (retry or surface error).
- [ ] PR description names the queue choice + why.`,
  },
  {
    week: 5,
    day: 3,
    title: "User dashboard with usage stats",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Build a user dashboard showing their key usage numbers for the niche (e.g. tickets resolved, AI calls made, $ saved). Aggregates computed in SQL, not JS after a full scan.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Dashboard shows ≥ 3 distinct metrics.
- [ ] Aggregates use SQL \`SUM\` / \`COUNT\` / \`AVG\`, not in-memory reduce.
- [ ] Empty state for fresh users is handled.
- [ ] Page loads ≤ 500ms p95 (PR description shows the number).
- [ ] One metric reflects something the user can act on.`,
  },
  {
    week: 5,
    day: 4,
    title: "In-app notifications",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Build an in-app notification center. New notifications appear in a bell icon dropdown. Unread count badge. Mark-as-read action.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] \`notifications\` table exists with \`read_at\` nullable.
- [ ] Bell icon shows unread count badge.
- [ ] Clicking a notification marks it read via Server Action.
- [ ] Empty state handled.
- [ ] No polling tighter than every 30s.`,
  },
  {
    week: 5,
    day: 5,
    title: "Search + filtering on main entity",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Add search + at least 2 filter dimensions for the main entity. Use URL state (search params) so it's shareable. Debounce input.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Search query lives in URL search params.
- [ ] At least 2 filter dimensions (status, owner, date, etc.).
- [ ] Input is debounced (≥ 250ms).
- [ ] Empty result state is handled with a CTA.
- [ ] DB query uses an index for the searched column (PR notes the index).`,
  },
  {
    week: 5,
    day: 6,
    title: "Performance audit + fix slowest page",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Identify your slowest production page. Bring server response under 300ms p95. Techniques: select only needed columns, add an index, parallelize awaits, cache an aggregate.

PR description must show before/after p95 numbers.`,
    successCriteriaMd: `- [ ] Before/after p95 numbers shown in PR description.
- [ ] At least one migration adds an index, OR a documented reason not to.
- [ ] No regression on 3 sampled other routes (timings shown).
- [ ] Lighthouse Performance ≥ 90 on the fixed route.`,
  },
  {
    week: 5,
    day: 7,
    title: "Weekly retro — week 5",
    submissionType: "text_answer",
    estimatedHours: 1,
    descriptionMd: `Same five questions:

1. Shipped this week.
2. Slipped + why.
3. Hardest bug + fix.
4. Biggest week-6 risk (launch is week 7).
5. Pre-decided cut if risk fires.`,
    successCriteriaMd: `- [ ] All 5 answered.
- [ ] Slip items named explicitly.
- [ ] Risk is concrete.
- [ ] Cut is a real line item.`,
  },

  // ───────── Week 6 — pre-launch polish ─────────
  {
    week: 6,
    day: 1,
    title: "Deploy to custom domain",
    submissionType: "url",
    estimatedHours: 2,
    descriptionMd: `Buy or wire a custom domain. HTTPS via Vercel. Subdomain pattern decided (apex for landing, app on \`app.\` or \`/app\`).

Submit the production URL on the custom domain.`,
    successCriteriaMd: `- [ ] URL uses your custom domain (not \`*.vercel.app\`).
- [ ] HTTPS works; no mixed-content warnings.
- [ ] \`www\` and apex both resolve (one redirects to the other).
- [ ] Email-sending (if used) authenticates SPF + DKIM.`,
  },
  {
    week: 6,
    day: 2,
    title: "SEO + OG + sitemap",
    submissionType: "github_commit",
    estimatedHours: 2,
    descriptionMd: `Make the app shareable.

- \`generateMetadata\` per public route.
- OG image generated via \`ImageResponse\`.
- \`sitemap.xml\` and \`robots.txt\` via Next file conventions.
- Submit the sitemap to Google Search Console.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Sharing the public URL in Slack / X shows a rich card with the right OG image.
- [ ] \`/sitemap.xml\` is reachable and lists the public routes.
- [ ] PR description includes a Search Console screenshot.
- [ ] Lighthouse SEO ≥ 95 on the landing page.`,
  },
  {
    week: 6,
    day: 3,
    title: "Docs / help page",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Add \`/docs\` with two pages:

1. **Getting started** — sign-up to first value in under 10 minutes.
2. **How-to** for the killer AI feature.

Render markdown via \`react-markdown\` + \`remark-gfm\`. Code blocks highlighted.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Both pages reachable from /docs.
- [ ] Following only "Getting started" gets a fresh user to first value.
- [ ] Code blocks render highlighted.
- [ ] At least one internal link between the two pages.
- [ ] /docs has a working table of contents.`,
  },
  {
    week: 6,
    day: 4,
    title: "Accessibility audit + fixes",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Run axe DevTools (or Lighthouse Accessibility) on every signed-in route. Fix the top 5 issues.

PR description lists all 5 with before/after.`,
    successCriteriaMd: `- [ ] PR description lists 5 distinct issues with before/after.
- [ ] Lighthouse Accessibility ≥ 95 on every signed-in route.
- [ ] All form inputs have associated labels.
- [ ] Color contrast meets WCAG AA on all surfaces.
- [ ] Tab order is sensible on at least one form.`,
  },
  {
    week: 6,
    day: 5,
    title: "Bug bash with launch checklist",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Run a launch checklist as a fresh user in incognito. Fix every blocking bug found.

PR description must include the full checklist with yes/no per item:
sign-up, email verification, onboarding, dashboard, AI feature, billing checkout, billing portal, settings, sign-out, 404 page, 500 page, dark mode, mobile, OG share preview, sitemap, privacy/terms.`,
    successCriteriaMd: `- [ ] Every checklist item has yes / no in the PR description.
- [ ] Any "no" became a fix in this PR (or has an explicit ticket reference).
- [ ] No P0 / P1 bugs open at end of day.
- [ ] PR description includes a Loom of the incognito walkthrough.`,
  },
  {
    week: 6,
    day: 6,
    title: "Launch announcement assets",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `Have ready for week 7 day 1:

1. 60-second demo Loom URL.
2. Product Hunt draft: tagline, description, first comment text.
3. X / LinkedIn launch thread (6 tweets / 1 post) — paste verbatim.
4. Email template for the 5 discovery-call contacts — paste verbatim with placeholder for name/company.`,
    successCriteriaMd: `- [ ] Loom is public and ≤ 70 seconds.
- [ ] Product Hunt tagline ≤ 60 chars; first comment ≥ 100 words.
- [ ] Launch thread leads with a hook, not "we're excited".
- [ ] Email template references the original discovery call.`,
  },
  {
    week: 6,
    day: 7,
    title: "Weekly retro — week 6 + go/no-go",
    submissionType: "text_answer",
    estimatedHours: 1,
    descriptionMd: `Decide explicitly: launch Monday, or push by N days?

Answer:

1. Go / no-go.
2. If go: what could go wrong on launch day + your mitigation per item.
3. If no-go: exactly what blocks launch and the new ship date.
4. The single most important thing to do tomorrow morning.`,
    successCriteriaMd: `- [ ] Go / no-go is explicit.
- [ ] If go: ≥ 3 risks named with mitigations.
- [ ] If no-go: blockers named + new date is specific.
- [ ] Tomorrow's first task is a single line.`,
  },

  // ───────── Week 7 — ship to discovery users ─────────
  {
    week: 7,
    day: 1,
    title: "Send MVP to 5 discovery users",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `Send personalized intro + product link to each of the 5 users from your week 1 discovery calls.

Per user paste:

1. Name + company.
2. Channel (email, DM, etc.).
3. The message you sent (verbatim).
4. Time sent.
5. Their initial reply (or "pending").`,
    successCriteriaMd: `- [ ] All 5 reached on the same day.
- [ ] Each message references their original discovery-call pain.
- [ ] No copy-pasted templates (each message is distinct).
- [ ] At least 2 replies logged before end of day.`,
  },
  {
    week: 7,
    day: 2,
    title: "Structured feedback collection mechanism",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Ship an in-product feedback widget OR a structured Typeform/Tally survey + a server-side webhook capturing responses into a \`feedback\` table.

Tag each entry with user_id, page (or step), and a 1-3 sentence response.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Feedback lands in DB, not just an external tool.
- [ ] Each entry tagged with user_id and page.
- [ ] Widget / link is reachable from every signed-in page.
- [ ] PR description shows 3 real entries already captured.`,
  },
  {
    week: 7,
    day: 3,
    title: "Iteration 1: ship #1 issue from feedback",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Pick the most-mentioned issue from yesterday's feedback. Ship a fix today. Notify the user(s) who reported it.

Submit the commit URL. PR description must quote the user feedback that drove the fix.`,
    successCriteriaMd: `- [ ] PR description quotes the original feedback verbatim.
- [ ] Fix is deployed to production.
- [ ] User(s) who reported are notified (Loom, message, or in-app).
- [ ] No regression on 2 unrelated routes (smoke test in PR).`,
  },
  {
    week: 7,
    day: 4,
    title: "Iteration 2: ship #2 issue",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Same process — second-most-mentioned issue. Ship + notify.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] PR quotes feedback.
- [ ] Deployed.
- [ ] User(s) notified.
- [ ] No regression on 2 unrelated routes.`,
  },
  {
    week: 7,
    day: 5,
    title: "Iteration 3: ship #3 issue",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Third issue. Same process.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] PR quotes feedback.
- [ ] Deployed.
- [ ] User(s) notified.
- [ ] No regression on 2 unrelated routes.`,
  },
  {
    week: 7,
    day: 6,
    title: "Build-in-public LinkedIn post — week 7",
    submissionType: "url",
    estimatedHours: 1,
    descriptionMd: `Publish a LinkedIn post about week 7. Concrete: number of users onboarded, top 3 fixes shipped, one surprise.

Submit the public post URL.`,
    successCriteriaMd: `- [ ] Post is public.
- [ ] Includes at least 3 specific numbers / facts.
- [ ] Mentions one specific user (named or anonymized).
- [ ] Word count 80–250.`,
  },
  {
    week: 7,
    day: 7,
    title: "Weekly retro — week 7 + feedback synthesis",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Answer:

1. Sign-ups this week (number).
2. Activated users (used core feature ≥ 1x).
3. Top 5 distinct feedback themes (1 line each).
4. Theme you'll act on next week.
5. Theme you'll explicitly NOT act on (and why).`,
    successCriteriaMd: `- [ ] Numbers are real (screenshot from analytics / DB).
- [ ] 5 distinct themes (no overlap).
- [ ] Action theme + non-action theme both named.
- [ ] Reasoning for the non-action is one specific sentence.`,
  },

  // ───────── Week 8 — Stripe live + first paying user ─────────
  {
    week: 8,
    day: 1,
    title: "Stripe live mode + production keys",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Flip Stripe to live mode. Production webhook signing secret is set. Live keys in Vercel env. Test by paying yourself for the cheapest tier (refund after).

Submit the commit URL of the env / config changes (NOT the live keys themselves).`,
    successCriteriaMd: `- [ ] Live mode toggled in Stripe Dashboard (PR description confirms).
- [ ] Webhook URL points at production domain with live signing secret.
- [ ] PR description: real live charge succeeded + was refunded (Stripe payment ID).
- [ ] No live keys in any commit (search the diff).`,
  },
  {
    week: 8,
    day: 2,
    title: "Pricing page polish + plan tiers",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Polish \`/pricing\`:

- 3 tiers, middle highlighted.
- "Compare plans" table below.
- FAQ with 4–6 real concerns from your discovery calls.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] 3 tiers, prices are real numbers you'd charge.
- [ ] Middle tier visually emphasized.
- [ ] Compare table covers ≥ 5 features.
- [ ] FAQ uses concerns from real discovery calls (PR description quotes 1 source).
- [ ] Mobile layout stacks cleanly at 360px.`,
  },
  {
    week: 8,
    day: 3,
    title: "First paying user push outreach",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `Reach out to 10 specific people who could become paying user #1.

Per person paste: name, company, why they're a fit, channel, message sent (verbatim), reply (or "pending").`,
    successCriteriaMd: `- [ ] 10 specific named people.
- [ ] Each message is a direct ask, not "would love your feedback".
- [ ] At least 3 are warm leads (already know your product or you).
- [ ] At least 2 replies before end of day.`,
  },
  {
    week: 8,
    day: 4,
    title: "Onboarding for paid users",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Paid users hit a different onboarding surface than free: highlight the killer feature first, optional 1:1 booking link, "what would success look like in 7 days" capture.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Paid users see a different first-run flow than free.
- [ ] 7-day-success input is captured into DB (per-user).
- [ ] Optional booking link present (Calendly / Cal.com / etc.).
- [ ] Free users do not see this flow (test from a free account).`,
  },
  {
    week: 8,
    day: 5,
    title: "First paying user converted",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `If you have a paying user — answer:

1. Name + company.
2. Plan + amount.
3. Time from first contact → payment.
4. The moment they decided (best guess + evidence).
5. The objection you almost lost on.

If not yet — answer:

1. The 3 closest leads (name + company + last touch).
2. Why each hasn't bought yet.
3. The single change you'll try by Sunday.`,
    successCriteriaMd: `- [ ] Either: paying user named with all 5 fields, OR 3 leads named with all 3 fields.
- [ ] No vague "we're getting close" — specific evidence.
- [ ] If unconverted: the change is one concrete action, dated.`,
  },
  {
    week: 8,
    day: 6,
    title: "Build-in-public LinkedIn post — week 8",
    submissionType: "url",
    estimatedHours: 1,
    descriptionMd: `Post about week 8 publicly. Numbers + one lesson.

Submit the public post URL.`,
    successCriteriaMd: `- [ ] Public post.
- [ ] ≥ 3 specific numbers.
- [ ] Mentions Stripe / billing / first paying user honestly.
- [ ] Word count 80–250.`,
  },
  {
    week: 8,
    day: 7,
    title: "Weekly retro — week 8",
    submissionType: "text_answer",
    estimatedHours: 1,
    descriptionMd: `Numbers + 5-question retro.

1. Sign-ups (week + cumulative).
2. Activated users (week + cumulative).
3. Paying users + MRR.
4. Surprise of the week (positive or negative).
5. Single highest-leverage thing for week 9.`,
    successCriteriaMd: `- [ ] All numbers from real sources (analytics / Stripe / DB).
- [ ] Surprise is specific.
- [ ] Week 9 priority is one line, one decision.`,
  },

  // ───────── Week 9 — retain + iterate ─────────
  {
    week: 9,
    day: 1,
    title: "Churn conversation with one inactive user",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Pick one user who signed up but stopped using the product. Reach out. Get them on a call OR have a written exchange.

Paste:

1. User name + company + signup date + last-active date.
2. Channel + medium of the conversation.
3. Verbatim: their answer to "what made you stop?".
4. Verbatim: their answer to "what would bring you back?".
5. Your call: this-is-our-problem or this-is-their-life. One sentence why.`,
    successCriteriaMd: `- [ ] Real user named with dates.
- [ ] Both verbatim quotes captured.
- [ ] Your problem-vs-life call is explicit.
- [ ] One concrete follow-up planned for this week.`,
  },
  {
    week: 9,
    day: 2,
    title: "Activation metric instrumentation",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Define "activated" for your product (e.g. "completed action X within first session"). Instrument it. Persist a query / dashboard.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Activation definition written down (in code or /docs).
- [ ] A reproducible SQL query computes the rate.
- [ ] Current rate recorded in PR description.
- [ ] Test from a fresh account: the event fires correctly.`,
  },
  {
    week: 9,
    day: 3,
    title: "Onboarding A/B based on activation",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Modify onboarding to push new users toward the activation moment. Either: hard route them through it, OR run a controlled A/B if your traffic supports it.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Change is live in production.
- [ ] Baseline activation rate captured pre-change.
- [ ] Plan to measure post-change is in PR description (window + decision rule).
- [ ] If A/B: assignment is sticky per-user (PR shows the impl).`,
  },
  {
    week: 9,
    day: 4,
    title: "Cohort retention dashboard",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Internal-only dashboard at \`/admin/retention\`. Shows D1, D7, D30 retention by signup-week cohort. Gated to your own user account.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Route is gated to an admin user (test from a non-admin account: 404 / redirect).
- [ ] D1, D7, D30 columns visible per cohort.
- [ ] Cohorts grouped by ISO signup-week.
- [ ] Renders without error on real production data.`,
  },
  {
    week: 9,
    day: 5,
    title: "Email sequence for new users",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Wire transactional email (Resend / Postmark). Send a 3-email sequence to new sign-ups: welcome, day-3 nudge to the killer feature, day-7 ask "did this work?".

Each email content lives in \`emails/<name>.tsx\` (React Email or plain template).

Submit the commit URL.`,
    successCriteriaMd: `- [ ] 3 email templates committed under \`emails/\`.
- [ ] Sequence is triggered by sign-up event, not a cron.
- [ ] All emails render correctly in Gmail + Apple Mail (PR description includes screenshots).
- [ ] Unsubscribe link works in all 3.`,
  },
  {
    week: 9,
    day: 6,
    title: "Build-in-public LinkedIn post — week 9",
    submissionType: "url",
    estimatedHours: 1,
    descriptionMd: `Public post about week 9 — retention angle. Numbers + one lesson.

Submit the public post URL.`,
    successCriteriaMd: `- [ ] Public post.
- [ ] At least 3 specific numbers.
- [ ] One lesson explicitly named.
- [ ] Word count 80–250.`,
  },
  {
    week: 9,
    day: 7,
    title: "Weekly retro — week 9",
    submissionType: "text_answer",
    estimatedHours: 1,
    descriptionMd: `Same five numbers + retro.

1. Sign-ups (week + cumulative).
2. Activation rate this week.
3. Paying users + MRR.
4. Did the activation A/B move the metric? Evidence.
5. Single biggest unknown for week 10.`,
    successCriteriaMd: `- [ ] Numbers from real sources.
- [ ] A/B evidence specific (n + rate before vs after).
- [ ] Unknown is concrete.`,
  },

  // ───────── Week 10 — scale signal ─────────
  {
    week: 10,
    day: 1,
    title: "Pricing iteration",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Adjust pricing based on what you've learned: raise, change tiers, add annual, or change a plan limit. Existing customers grandfathered.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Stripe products updated (PR description includes Stripe IDs).
- [ ] Pricing page reflects new tiers.
- [ ] Grandfathering enforced in code (existing user keeps old price — verified in PR).
- [ ] No billing test bug (PR includes a test-mode subscription transition).`,
  },
  {
    week: 10,
    day: 2,
    title: "Referral mechanic shipped",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Ship one mechanism that turns existing users into a source of new ones: referral credit, public share-link with branding, "invite teammate" flow, or shareable artifact with attribution.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Mechanism is live and reachable from a primary surface.
- [ ] Referrer + referred user are tracked in DB (FK relationship).
- [ ] Reward (if any) is automatic, not manual.
- [ ] At least one real referred user (or a test conversion) demonstrated in PR.`,
  },
  {
    week: 10,
    day: 3,
    title: "Affiliate or partner outreach",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `Send 5 affiliate / partner / influencer outreach messages — adjacent products, communities, or creators in your niche.

Per outreach: name + audience size + channel + message verbatim + reply.`,
    successCriteriaMd: `- [ ] 5 specific outreaches.
- [ ] Each names an audience size estimate.
- [ ] Messages are personalized (no copy-paste).
- [ ] At least 1 reply by end of day.`,
  },
  {
    week: 10,
    day: 4,
    title: "Customer interview with paying user",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `30-minute interview with a paying user. Ask:

1. What were you using before?
2. When did you decide to pay? What triggered it?
3. The most useful thing you've done in the product.
4. What would make you recommend us?
5. What would make you churn?

Capture verbatim where possible.`,
    successCriteriaMd: `- [ ] All 5 questions answered.
- [ ] At least 3 verbatim quotes.
- [ ] One concrete follow-up identified.
- [ ] User named with company + plan.`,
  },
  {
    week: 10,
    day: 5,
    title: "Performance pass for top 3 routes",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Identify your top-3 most-viewed routes from analytics. Bring p95 server response < 250ms on each.

Submit the commit URL with before/after numbers per route.`,
    successCriteriaMd: `- [ ] PR description lists 3 routes with before/after p95.
- [ ] Each route's after p95 ≤ 250ms.
- [ ] At least one new index OR one cache layer added.
- [ ] No regression on 3 sampled other routes.`,
  },
  {
    week: 10,
    day: 6,
    title: "Build-in-public LinkedIn post — week 10",
    submissionType: "url",
    estimatedHours: 1,
    descriptionMd: `Public week-10 post: 30-day MRR snapshot + lesson.

Submit the public post URL.`,
    successCriteriaMd: `- [ ] Public post.
- [ ] 30-day MRR named explicitly.
- [ ] One lesson + one tactic the reader could apply.
- [ ] Word count 80–250.`,
  },
  {
    week: 10,
    day: 7,
    title: "Weekly retro + 30-day MRR review",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `End of week 10. Answer:

1. Total sign-ups + active users + paying users + MRR.
2. Week-over-week growth rate (sign-ups, activations, MRR).
3. Best distribution channel + worst channel.
4. The single experiment from weeks 7–10 you'd run again.
5. Going into the week-11 checkpoint: what you suspect the right call will be (scale / pivot / retry) and why.`,
    successCriteriaMd: `- [ ] All four numbers real.
- [ ] WoW % growth named.
- [ ] Best + worst channel named.
- [ ] Suspected call is one of {scale, pivot, retry} with one-sentence reasoning.`,
  },

  // ───────── Week 11 — checkpoint + branch ─────────
  {
    week: 11,
    day: 1,
    title: "Checkpoint decision: scale, pivot, or retry",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `End of build-and-launch phase. Make the call.

Required:

1. **Numbers**: total users, active users, paying users, MRR (with screenshot in your notes).
2. **Growth**: WoW change for users + MRR over the last 4 weeks.
3. **Decision**: \`scale\`, \`pivot\`, or \`retry\`.
4. **Why this and not the others**: one paragraph for each path you rejected.
5. **What you give up**: the concrete thing(s) you cut to commit to this path.
6. **Success metric for end of week 14** if this path works.`,
    successCriteriaMd: `- [ ] Decision is one word: \`scale\`, \`pivot\`, or \`retry\`.
- [ ] All four numbers cited.
- [ ] Both rejected paths have a paragraph each.
- [ ] Give-up list is concrete (≥ 1 item dropped).
- [ ] Week-14 success metric is measurable.`,
  },
  {
    week: 11,
    day: 2,
    title: "Path-specific kickoff",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `Do the path you chose yesterday. Paste under one of the headers below and ignore the others.

**[scale]** — paid acquisition kickoff. Define: budget for the next 4 weeks, channels you'll test (1 primary, 1 backup), target CPA, kill criteria. Set up ad accounts.

**[pivot]** — list 10 named prospects in your new niche (within your same buyer-audience). Why each is a fit. Channel for each.

**[retry]** — set new freelance rate (specific $/hr or fixed package). List 10 outbound targets. Refresh portfolio with the strongest piece you shipped weeks 1–10.`,
    successCriteriaMd: `- [ ] Only your chosen path is filled in.
- [ ] **[scale]**: budget + 2 channels + CPA + kill criteria all explicit.
- [ ] **[pivot]**: 10 named prospects with company + reason + channel each.
- [ ] **[retry]**: rate + 10 targets named + portfolio piece chosen.`,
  },
  {
    week: 11,
    day: 3,
    title: "Path-specific execution day 1",
    submissionType: "text_answer",
    estimatedHours: 4,
    descriptionMd: `**[scale]** — first paid experiment live. Paste: ad creative, audience, daily budget, landing page URL, first-hour metrics.

**[pivot]** — first 3 discovery calls done. Per call: name + role + biggest pain in their words + would-they-pay condition.

**[retry]** — 5 outbound DMs sent at the new rate. Per DM: name + company + message verbatim + reply.`,
    successCriteriaMd: `- [ ] Only your chosen path is filled in.
- [ ] **[scale]**: ad live + first-hour numbers (impressions, clicks, sign-ups).
- [ ] **[pivot]**: 3 calls completed today + structured notes.
- [ ] **[retry]**: 5 messages sent today + replies (or "pending").`,
  },
  {
    week: 11,
    day: 4,
    title: "Path-specific iteration",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `**[scale]** — kill or iterate the experiment based on yesterday's numbers. State decision + new variant.

**[pivot]** — synthesize the 3 calls. Top 2 pains, repeated phrases, dollar amounts heard. Decide: same niche, refine offer, or another niche?

**[retry]** — synthesize the 5 outbound replies. What did the rate raise change? Adjust pitch or stay course.`,
    successCriteriaMd: `- [ ] Only your chosen path is filled in.
- [ ] Decision recorded explicitly (kill / iterate / continue).
- [ ] Reasoning cites yesterday's data.
- [ ] Next concrete action is named with a date.`,
  },
  {
    week: 11,
    day: 5,
    title: "Build-in-public LinkedIn post — week 11 (the decision)",
    submissionType: "url",
    estimatedHours: 1,
    descriptionMd: `Public post explaining the decision (scale / pivot / retry). Real numbers, real reasoning. No spin.

Submit the public post URL.`,
    successCriteriaMd: `- [ ] Public post.
- [ ] States the decision explicitly.
- [ ] Includes ≥ 3 numbers.
- [ ] Word count 80–250.
- [ ] Ends with what you're doing next.`,
  },
  {
    week: 11,
    day: 6,
    title: "Path-specific deeper work",
    submissionType: "text_answer",
    estimatedHours: 4,
    descriptionMd: `**[scale]** — second paid experiment live (different angle: copy, audience, or channel). Paste setup + first numbers.

**[pivot]** — 3 more discovery calls in the new niche. Same structured-notes format as Day 3.

**[retry]** — book 2 calls from this week's outreach. Paste names + dates.`,
    successCriteriaMd: `- [ ] Only your chosen path is filled in.
- [ ] **[scale]**: second variant live + first numbers.
- [ ] **[pivot]**: 3 more structured-notes call writeups.
- [ ] **[retry]**: 2 booked calls with dates.`,
  },
  {
    week: 11,
    day: 7,
    title: "Weekly retro — week 11",
    submissionType: "text_answer",
    estimatedHours: 1,
    descriptionMd: `Answer:

1. Path chosen (restate).
2. What changed in your conviction after this week's execution?
3. Single biggest learning specific to your path.
4. The scary thing about week 12 — name it.`,
    successCriteriaMd: `- [ ] Path restated explicitly.
- [ ] Conviction shift is specific (not "I'm more / less sure").
- [ ] Learning is path-specific.
- [ ] Scary thing is concrete.`,
  },

  // ───────── Week 12 — path-deep execution ─────────
  {
    week: 12,
    day: 1,
    title: "Path: ICP / audience refinement",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `**[scale]** — refine your best-converting audience based on week-11 ad data. New audience definition + why.

**[pivot]** — refine your new-niche ICP based on the calls. New 1-sentence ICP + 5 named target users.

**[retry]** — refine your service offer based on week-11 calls. New 1-paragraph pitch + the next 5 outbound targets.`,
    successCriteriaMd: `- [ ] Refined definition is more specific than week-11's (compare).
- [ ] 5 named targets / users with companies.
- [ ] One sentence on what you removed from the previous definition and why.`,
  },
  {
    week: 12,
    day: 2,
    title: "Path: experiment design",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Design this week's experiment with hypothesis, leading metric, kill criteria, and success threshold.

**[scale]** — landing variant or audience-targeting test.
**[pivot]** — landing variant or messaging test for the new niche.
**[retry]** — outbound message template variant or new lead source.

Specify: hypothesis, leading metric (measurable by Friday), kill criteria, success threshold.`,
    successCriteriaMd: `- [ ] Hypothesis is one specific sentence.
- [ ] Leading metric is leading (not lagging).
- [ ] Kill criteria is a number.
- [ ] Success threshold is a number.`,
  },
  {
    week: 12,
    day: 3,
    title: "Path: experiment launch",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `Ship the experiment artifact.

**[scale]** — new landing variant or new ad creative deployed.
**[pivot]** — new landing copy / page deployed.
**[retry]** — new portfolio piece or new pitch page deployed.

Submit the commit URL of whatever artifact got shipped.`,
    successCriteriaMd: `- [ ] Artifact is live (URL in PR description).
- [ ] Tracking is in place to measure the leading metric.
- [ ] Variant or change is materially different from the prior version.
- [ ] Loom or screenshot of the live result in PR description.`,
  },
  {
    week: 12,
    day: 4,
    title: "Path: results capture",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Capture the actual numbers from this week's experiment.

**[scale]** — impressions, clicks, sign-ups, paying conversions, CPA.
**[pivot]** — landing visits, conversion rate, qualified leads booked.
**[retry]** — outreach sent, replies, calls booked, pipeline value.

Then compare against this week's hypothesis and threshold.`,
    successCriteriaMd: `- [ ] All path-specific metrics filled in with real numbers.
- [ ] Hit / miss vs threshold stated explicitly.
- [ ] One-sentence interpretation: why this number?
- [ ] Decision named: continue / kill / change variable.`,
  },
  {
    week: 12,
    day: 5,
    title: "Build-in-public LinkedIn post — week 12",
    submissionType: "url",
    estimatedHours: 1,
    descriptionMd: `Public post: this week's experiment + result + lesson. Honest if it failed.

Submit the public post URL.`,
    successCriteriaMd: `- [ ] Public post.
- [ ] Names the experiment + the number.
- [ ] States whether it worked, honestly.
- [ ] Word count 80–250.`,
  },
  {
    week: 12,
    day: 6,
    title: "Path: iteration based on results",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `Based on yesterday's capture, run the next iteration today.

**[scale]** — adjust audience / creative / budget. New ad live.
**[pivot]** — adjust messaging or pricing on the new-niche page. Send to next 5 targets.
**[retry]** — adjust outbound or rate. Send next 10 messages.

Paste the action you took and the first signal.`,
    successCriteriaMd: `- [ ] Action is concrete (not "kept iterating").
- [ ] First signal recorded (numbers or replies).
- [ ] Time-stamped.`,
  },
  {
    week: 12,
    day: 7,
    title: "Weekly retro — week 12",
    submissionType: "text_answer",
    estimatedHours: 1,
    descriptionMd: `1. MRR / pipeline movement.
2. Conviction in path (1–10) and why it shifted.
3. Next experiment for week 13.
4. Single thing to stop doing.`,
    successCriteriaMd: `- [ ] Movement quantified.
- [ ] Conviction shift explained with a specific reason.
- [ ] Next experiment is one line.
- [ ] Stop-list has at least one item.`,
  },

  // ───────── Week 13 — path-broaden / consolidate ─────────
  {
    week: 13,
    day: 1,
    title: "Path: 10 outbound moves",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `**[scale]** — 10 messages to high-value targets (sales-led if PLG isn't enough on its own).
**[pivot]** — 10 messages in the new niche.
**[retry]** — 10 messages to the next layer of outbound targets.

Per message: name + company + channel + message verbatim + reply.`,
    successCriteriaMd: `- [ ] 10 messages all named.
- [ ] No template repetition.
- [ ] At least 2 replies before end of day.
- [ ] One booked next-step.`,
  },
  {
    week: 13,
    day: 2,
    title: "Path: customer / prospect interview",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Run one interview today.

**[scale]** — interview a paying user about expansion potential.
**[pivot]** — interview a new-niche prospect deeper than discovery.
**[retry]** — interview a recent freelance buyer about the next problem they'd pay for.

5 questions tailored to your path. Paste verbatim where possible.`,
    successCriteriaMd: `- [ ] Real human named.
- [ ] 5 questions answered.
- [ ] At least 3 verbatim quotes.
- [ ] One follow-up action named.`,
  },
  {
    week: 13,
    day: 3,
    title: "Path: ship one feature / asset",
    submissionType: "github_commit",
    estimatedHours: 4,
    descriptionMd: `**[scale]** — ship a feature requested by ≥ 3 paying users.
**[pivot]** — ship a niche-specific landing variant for the new niche.
**[retry]** — ship a public asset (case study page, mini-tool, comparison) that drives inbound.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Deployed to production with a URL.
- [ ] PR description names the path-specific reason.
- [ ] If user-driven: PR cites the users by initials.
- [ ] No regression on 2 unrelated routes.`,
  },
  {
    week: 13,
    day: 4,
    title: "Path: pricing / positioning revisit",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `**[scale]** — review pricing tier mix from week 8 onward. Decide: hold, raise, or restructure. Justify with data.

**[pivot]** — set explicit positioning + price for the new niche. One paragraph.

**[retry]** — final freelance rate + package list. Three packages with price + scope + timeline.`,
    successCriteriaMd: `- [ ] Decision is explicit (hold / change / restructure).
- [ ] Reasoning cites at least one data point.
- [ ] If changing: new prices listed.
- [ ] If retry: 3 packages each with price + scope + timeline.`,
  },
  {
    week: 13,
    day: 5,
    title: "Build-in-public LinkedIn post — week 13",
    submissionType: "url",
    estimatedHours: 1,
    descriptionMd: `Public post: a hard-earned tactical lesson from this week. Specific, copy-pastable.

Submit the public post URL.`,
    successCriteriaMd: `- [ ] Public post.
- [ ] Names a specific tactic the reader could apply.
- [ ] Includes one number or example.
- [ ] Word count 80–250.`,
  },
  {
    week: 13,
    day: 6,
    title: "Path: convert one new sale / outcome",
    submissionType: "text_answer",
    estimatedHours: 3,
    descriptionMd: `**[scale]** — close one paying user this week. Name + plan + amount + close path.
**[pivot]** — close one paying user (or signed LOI) in the new niche. Same fields.
**[retry]** — sign one freelance contract at the new rate. Client + scope + amount + start date.

If you didn't close — paste the 3 closest paths and what blocked each.`,
    successCriteriaMd: `- [ ] Either: real conversion with all fields, OR 3 blocked paths with named reason.
- [ ] If converted: actual revenue / contract amount listed.
- [ ] One concrete next action for the closest unclosed lead.`,
  },
  {
    week: 13,
    day: 7,
    title: "Weekly retro — week 13",
    submissionType: "text_answer",
    estimatedHours: 1,
    descriptionMd: `1. MRR / pipeline / contract value movement.
2. Conviction in path (1–10).
3. The thing you regret not doing earlier in this 13-week stretch.
4. Single most valuable thing to do in week 14.`,
    successCriteriaMd: `- [ ] Movement quantified.
- [ ] Conviction stated.
- [ ] Regret is specific.
- [ ] Week-14 single-thing is one line.`,
  },

  // ───────── Week 14 — 90-day close ─────────
  {
    week: 14,
    day: 1,
    title: "90-day numbers writeup",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Writeup of the full 90 days.

Sections (use these exact headers):

- **Where I started**: a paragraph naming what you could and couldn't do on day 1.
- **What shipped**: bullet list of every commit-able artifact.
- **What I sold**: revenue / contracts / pipeline.
- **What I learned**: 5 specific lessons (1 sentence each).
- **What I got wrong**: 3 things you believed in week 1 that turned out wrong.
- **Numbers today**: users, active users, paying users, MRR.`,
    successCriteriaMd: `- [ ] All 6 headers present.
- [ ] What-shipped list is ≥ 10 items.
- [ ] What-I-got-wrong has 3 distinct items.
- [ ] All numbers from real sources.`,
  },
  {
    week: 14,
    day: 2,
    title: "Public 90-day post",
    submissionType: "url",
    estimatedHours: 2,
    descriptionMd: `Publish a 90-day public post (X / LinkedIn / blog). Real numbers + real story. Link to the product. Ask explicitly for what you want next (intros, customers, jobs, partners).

Submit the public URL.`,
    successCriteriaMd: `- [ ] Public.
- [ ] Includes ≥ 3 real numbers.
- [ ] Links to the product.
- [ ] Ends with a specific ask.
- [ ] Word count 200–600.`,
  },
  {
    week: 14,
    day: 3,
    title: "Final code polish ship",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `One last polish pass on the most-used surface. Could be onboarding copy, the killer feature, the dashboard, or a perf fix. Ship today.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] Deployed to production.
- [ ] PR description names the surface + the reason.
- [ ] Before / after metric or screenshot in PR.
- [ ] Affected users notified (if user-facing).`,
  },
  {
    week: 14,
    day: 4,
    title: "Hand-off / runbook update",
    submissionType: "github_commit",
    estimatedHours: 3,
    descriptionMd: `Write \`/docs/runbook.md\` covering: how to deploy, how to roll back, what to do if Stripe webhooks break, what to do if Anthropic outage hits, where logs live, key contacts.

Update README to current state of the world.

Submit the commit URL.`,
    successCriteriaMd: `- [ ] runbook.md committed and ≥ 3 incident types covered.
- [ ] README is accurate (a stranger could deploy following only the README).
- [ ] No stale env vars listed.
- [ ] Open draft PRs older than 14 days closed or labeled.`,
  },
  {
    week: 14,
    day: 5,
    title: "Build-in-public LinkedIn post — week 14: lessons + next bet",
    submissionType: "url",
    estimatedHours: 1,
    descriptionMd: `Public post: top 3 lessons from 90 days + what you're doing for the next 90.

Submit the public post URL.`,
    successCriteriaMd: `- [ ] Public.
- [ ] Top 3 lessons specific.
- [ ] Names next 90-day bet explicitly.
- [ ] Word count 80–250.`,
  },
  {
    week: 14,
    day: 6,
    title: "Next-90-days plan",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Same shape as week 1 day 1, sharper. Answer:

1. The single bet for the next 90 days.
2. 3 milestones with dates.
3. What you're cutting from your current life to make room for it.
4. The first task you'll do tomorrow morning.`,
    successCriteriaMd: `- [ ] One bet, not a portfolio.
- [ ] 3 milestones each with a calendar date.
- [ ] Cut list has ≥ 1 specific item.
- [ ] Tomorrow's task is one line.`,
  },
  {
    week: 14,
    day: 7,
    title: "Final retro: 90 days, candid",
    submissionType: "text_answer",
    estimatedHours: 2,
    descriptionMd: `Five questions:

1. What did you actually build / sell / earn?
2. What did you believe in week 1 that was wrong?
3. What did you believe in week 1 that was right?
4. What skill level-up is most visible (link a week-1 commit/message vs. a week-14 one)?
5. Would you do this again? Why?`,
    successCriteriaMd: `- [ ] All 5 answered honestly.
- [ ] Wrong belief specific (not "I underestimated time").
- [ ] Skill delta backed by a link or quote comparison.
- [ ] Final answer is yes/no with a single reason.`,
  },
];
