import { Router } from "express";
import { db } from "@workspace/db";
import { progressTable, quizAttemptsTable, enrollmentsTable, coursesTable, lessonsTable, modulesTable } from "@workspace/db/schema";
import { eq, and, count, avg, sum } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.get("/analytics/me", authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const [{ value: completedLessons }] = await db.select({ value: count() }).from(progressTable).where(and(eq(progressTable.userId, userId), eq(progressTable.completed, true)));
  const [{ value: enrolledCourses }] = await db.select({ value: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.userId, userId));
  const [{ value: totalWatched }] = await db.select({ value: sum(progressTable.watchedSeconds) }).from(progressTable).where(eq(progressTable.userId, userId));
  const [{ value: quizzesTaken }] = await db.select({ value: count() }).from(quizAttemptsTable).where(eq(quizAttemptsTable.userId, userId));
  const [{ value: avgScore }] = await db.select({ value: avg(quizAttemptsTable.score) }).from(quizAttemptsTable).where(eq(quizAttemptsTable.userId, userId));
  res.json({ completedLessons, enrolledCourses, totalStudySeconds: Number(totalWatched ?? 0), quizzesTaken, avgQuizScore: Number(avgScore ?? 0) });
});

router.get("/analytics/me/study-time", authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const records = await db.select({ watchedSeconds: progressTable.watchedSeconds, lastAccessed: progressTable.lastAccessed }).from(progressTable).where(eq(progressTable.userId, userId));
  const byDay: Record<string, number> = {};
  for (const r of records) {
    const day = r.lastAccessed.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + r.watchedSeconds;
  }
  const data = Object.entries(byDay).map(([date, seconds]) => ({ date, seconds })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  res.json(data);
});

router.get("/analytics/me/quiz-scores", authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const attempts = await db.select({ score: quizAttemptsTable.score, maxScore: quizAttemptsTable.maxScore, passed: quizAttemptsTable.passed, attemptedAt: quizAttemptsTable.attemptedAt }).from(quizAttemptsTable).where(eq(quizAttemptsTable.userId, userId)).limit(30);
  const data = attempts.map(a => ({ date: a.attemptedAt.toISOString().slice(0, 10), scorePercent: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0, passed: a.passed }));
  res.json(data);
});

export default router;
