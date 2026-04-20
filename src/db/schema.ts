import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const submissionTypes = ["github_commit", "text_answer", "url"] as const;
export type SubmissionType = (typeof submissionTypes)[number];

export const grades = ["pending", "pass", "revise", "fail", "manual"] as const;
export type Grade = (typeof grades)[number];

export const statuses = ["locked", "available", "in_progress", "passed"] as const;
export type Status = (typeof statuses)[number];

// ───────── tasks ─────────

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  week: integer("week").notNull(),
  day: integer("day").notNull(),
  title: text("title").notNull(),
  descriptionMd: text("description_md").notNull(),
  successCriteriaMd: text("success_criteria_md").notNull(),
  submissionType: text("submission_type", { enum: submissionTypes }).notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  prerequisites: text("prerequisites", { mode: "json" }).$type<number[]>().notNull().default([]),
});

// ───────── progress ─────────

export const progress = sqliteTable(
  "progress",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    status: text("status", { enum: statuses }).notNull().default("locked"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    passedAt: integer("passed_at", { mode: "timestamp" }),
    snoozedUntil: integer("snoozed_until", { mode: "timestamp" }),
  },
  (t) => ({ taskIdUnique: uniqueIndex("progress_task_id_unique").on(t.taskId) }),
);

// ───────── submissions (defined; unused this prompt) ─────────

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  submittedAt: integer("submitted_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  content: text("content").notNull(),
  feedbackMd: text("feedback_md"),
  grade: text("grade", { enum: grades }),
  specificIssues: text("specific_issues", { mode: "json" }).$type<string[]>(),
  tokenCost: integer("token_cost"),
  model: text("model"),
  // Self-referencing link to the submission this one replaced. FK enforced in
  // application code (SQLite doesn't need it here) — nullable on first submits.
  previousSubmissionId: integer("previous_submission_id"),
});

// ───────── lessons (defined; unused this prompt) ─────────

export const lessons = sqliteTable(
  "lessons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    conceptsMd: text("concepts_md").notNull(),
    workedExampleMd: text("worked_example_md").notNull(),
    diagramMermaid: text("diagram_mermaid"),
    generatedAt: integer("generated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    tokenCost: integer("token_cost").notNull().default(0),
    model: text("model"),
  },
  (t) => ({ taskIdUnique: uniqueIndex("lessons_task_id_unique").on(t.taskId) }),
);

// ───────── quiz_questions (defined; unused this prompt) ─────────

export const quizQuestions = sqliteTable("quiz_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonId: integer("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: text("options", { mode: "json" }).$type<string[]>().notNull(),
  correctIndex: integer("correct_index").notNull(),
  explanationMd: text("explanation_md").notNull(),
});

// ───────── quiz_attempts (defined; unused this prompt) ─────────

export const quizAttempts = sqliteTable("quiz_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id")
    .notNull()
    .references(() => quizQuestions.id, { onDelete: "cascade" }),
  answeredAt: integer("answered_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  selectedIndex: integer("selected_index").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
});

// ───────── settings (single row) ─────────

/**
 * Runtime-editable configuration. Exactly one row, id = 1. Env vars always
 * win at read time (so you can override anything per-deploy); the row holds
 * the persisted preferences edited on /settings.
 */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  anthropicApiKey: text("anthropic_api_key"),
  githubUsername: text("github_username"),
  lessonModel: text("lesson_model"),
  gradingModel: text("grading_model"),
  dailyBriefingEnabled: integer("daily_briefing_enabled", { mode: "boolean" }),
  stuckDetectorEnabled: integer("stuck_detector_enabled", { mode: "boolean" }),
  stuckHoursThreshold: integer("stuck_hours_threshold"),
  nextActionModel: text("next_action_model"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ───────── status_lines ("where you are" — date-unique) ─────────

export const paceLabels = [
  "on_pace",
  "slightly_behind",
  "ahead",
  "off_track",
] as const;
export type PaceLabel = (typeof paceLabels)[number];

export const statusLines = sqliteTable(
  "status_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    generatedAt: integer("generated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    /** YYYY-MM-DD in the server's local timezone. Unique → at most one per day. */
    statusDate: text("status_date").notNull(),
    messageMd: text("message_md").notNull(),
    paceLabel: text("pace_label", { enum: paceLabels }).notNull(),
    tokenCost: integer("token_cost").notNull().default(0),
    model: text("model"),
  },
  (t) => ({ dateUnique: uniqueIndex("status_lines_date_unique").on(t.statusDate) }),
);

// ───────── unblock_suggestions (stuck-detector) ─────────

export const unblockSuggestions = sqliteTable("unblock_suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  generatedAt: integer("generated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  suggestionMd: text("suggestion_md").notNull(),
  tokenCost: integer("token_cost").notNull().default(0),
  /** Set when the user clicks "Mark unblocked"; row stays for history. */
  dismissedAt: integer("dismissed_at", { mode: "timestamp" }),
});

// ───────── briefings (daily coaching) ─────────

export const briefings = sqliteTable(
  "briefings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    generatedAt: integer("generated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    /** YYYY-MM-DD in the server's local timezone. Unique → at most one per day. */
    briefingDate: text("briefing_date").notNull(),
    messageMd: text("message_md").notNull(),
    priorityTaskId: integer("priority_task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    tokenCost: integer("token_cost").notNull().default(0),
    model: text("model"),
  },
  (t) => ({ dateUnique: uniqueIndex("briefings_date_unique").on(t.briefingDate) }),
);

// ───────── retros ─────────

export interface RetroAnswers {
  shipped: string;
  blocked: string;
  learned: string;
  surprised: string;
  changing: string;
}

export const retros = sqliteTable(
  "retros",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    week: integer("week").notNull(),
    generatedAt: integer("generated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    answersJson: text("answers_json", { mode: "json" }).$type<RetroAnswers>().notNull(),
    claudeAssessmentMd: text("claude_assessment_md"),
    /** Cached themes Claude pulled from the assessment — one Haiku call per retro. */
    unresolvedThemesJson: text("unresolved_themes_json", { mode: "json" })
      .$type<string[]>(),
    tokenCost: integer("token_cost").notNull().default(0),
  },
  (t) => ({ weekUnique: uniqueIndex("retros_week_unique").on(t.week) }),
);

// ───────── notes (defined; unused this prompt) ─────────

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  bodyMd: text("body_md").notNull(),
});

// ───────── inferred types ─────────

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Retro = typeof retros.$inferSelect;
export type NewRetro = typeof retros.$inferInsert;
export type Briefing = typeof briefings.$inferSelect;
export type NewBriefing = typeof briefings.$inferInsert;
export type UnblockSuggestion = typeof unblockSuggestions.$inferSelect;
export type NewUnblockSuggestion = typeof unblockSuggestions.$inferInsert;
export type StatusLine = typeof statusLines.$inferSelect;
export type NewStatusLine = typeof statusLines.$inferInsert;
export type SettingsRow = typeof settings.$inferSelect;
export type NewSettingsRow = typeof settings.$inferInsert;
