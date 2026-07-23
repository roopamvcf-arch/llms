import { pgTable, serial, text, boolean, integer, real, timestamp } from "drizzle-orm/pg-core";
import { lessonsTable } from "./courses";
import { usersTable } from "./users";

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  instructions: text("instructions"),
  passPercent: integer("pass_percent").notNull().default(70),
  maxAttempts: integer("max_attempts").notNull().default(3),
  timeLimitSec: integer("time_limit_sec").notNull().default(0),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  type: text("type", { enum: ["MCQ", "MULTI", "TRUEFALSE"] }).notNull(),
  explanation: text("explanation"),
  orderIndex: integer("order_index").notNull().default(0),
  points: integer("points").notNull().default(1),
});

export const optionsTable = pgTable("options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
});

export const quizAttemptsTable = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull(),
  passed: boolean("passed").notNull(),
  answersJson: text("answers_json"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Quiz = typeof quizzesTable.$inferSelect;
export type Question = typeof questionsTable.$inferSelect;
export type Option = typeof optionsTable.$inferSelect;
export type QuizAttempt = typeof quizAttemptsTable.$inferSelect;
