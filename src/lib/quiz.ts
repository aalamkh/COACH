import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { quizAttempts, quizQuestions } from "@/db/schema";

export interface LatestAttempt {
  questionId: number;
  selectedIndex: number;
  correct: boolean;
  answeredAt: Date;
}

export type QuizGateState =
  | { kind: "no_lesson" }
  | { kind: "no_questions" }
  | { kind: "not_attempted"; total: number }
  | { kind: "passed"; total: number }
  | { kind: "partial"; correct: number; total: number };

export interface LessonQuiz {
  questions: Array<{
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanationMd: string;
  }>;
  latestByQuestion: Map<number, LatestAttempt>;
  gate: QuizGateState;
}

export function loadLessonQuiz(lessonId: number | null): LessonQuiz | null {
  if (lessonId === null) return null;

  const questionRows = db
    .select({
      id: quizQuestions.id,
      question: quizQuestions.question,
      options: quizQuestions.options,
      correctIndex: quizQuestions.correctIndex,
      explanationMd: quizQuestions.explanationMd,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.lessonId, lessonId))
    .all();

  const ids = questionRows.map((q) => q.id);
  let latestByQuestion = new Map<number, LatestAttempt>();
  if (ids.length > 0) {
    const allAttempts = db
      .select({
        questionId: quizAttempts.questionId,
        selectedIndex: quizAttempts.selectedIndex,
        correct: quizAttempts.correct,
        answeredAt: quizAttempts.answeredAt,
      })
      .from(quizAttempts)
      .where(inArray(quizAttempts.questionId, ids))
      .all();

    for (const a of allAttempts) {
      const cur = latestByQuestion.get(a.questionId);
      if (!cur || a.answeredAt.getTime() > cur.answeredAt.getTime()) {
        latestByQuestion.set(a.questionId, {
          questionId: a.questionId,
          selectedIndex: a.selectedIndex,
          correct: a.correct,
          answeredAt: a.answeredAt,
        });
      }
    }
  }

  const total = questionRows.length;
  let gate: QuizGateState;
  if (total === 0) {
    gate = { kind: "no_questions" };
  } else if (latestByQuestion.size === 0) {
    gate = { kind: "not_attempted", total };
  } else {
    const correct = Array.from(latestByQuestion.values()).filter((a) => a.correct).length;
    if (correct === total) gate = { kind: "passed", total };
    else gate = { kind: "partial", correct, total };
  }

  return { questions: questionRows, latestByQuestion, gate };
}
