import { Router } from "express";
import { db } from "@workspace/db";
import { quizzesTable, questionsTable, optionsTable, quizAttemptsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router = Router();

router.post("/lessons/:lessonId/quizzes", authenticate, requireAdmin, async (req, res) => {
  const { title, instructions, passPercent, maxAttempts, timeLimitSec } = req.body;
  const lessonId = parseInt(req.params['lessonId']! as string);
  const [quiz] = await db.insert(quizzesTable).values({ lessonId, title, instructions, passPercent: passPercent ?? 70, maxAttempts: maxAttempts ?? 3, timeLimitSec: timeLimitSec ?? 0 }).returning();
  res.status(201).json(quiz);
});

router.get("/quizzes/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params['id']! as string);
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id)).limit(1);
  if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, id)).orderBy(questionsTable.orderIndex);
  const questionsWithOptions = await Promise.all(questions.map(async (q) => {
    const options = await db.select().from(optionsTable).where(eq(optionsTable.questionId, q.id));
    const isStudent = req.user!.role !== "ADMIN";
    return { ...q, options: options.map(o => ({ id: o.id, optionText: o.optionText, ...(isStudent ? {} : { isCorrect: o.isCorrect }) })) };
  }));
  res.json({ ...quiz, questions: questionsWithOptions });
});

router.put("/quizzes/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params['id']! as string);
  const { title, instructions, passPercent, maxAttempts, timeLimitSec } = req.body;
  const [quiz] = await db.update(quizzesTable).set({ title, instructions, passPercent, maxAttempts, timeLimitSec }).where(eq(quizzesTable.id, id)).returning();
  if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
  res.json(quiz);
});

router.post("/quizzes/:id/questions", authenticate, requireAdmin, async (req, res) => {
  const quizId = parseInt(req.params['id']! as string);
  const { questionText, type, explanation, orderIndex, points, options } = req.body;
  const [question] = await db.insert(questionsTable).values({ quizId, questionText, type, explanation, orderIndex: orderIndex ?? 0, points: points ?? 1 }).returning();
  if (options && Array.isArray(options)) {
    await db.insert(optionsTable).values(options.map((o: { optionText: string; isCorrect: boolean }) => ({ questionId: question.id, optionText: o.optionText, isCorrect: o.isCorrect })));
  }
  const opts = await db.select().from(optionsTable).where(eq(optionsTable.questionId, question.id));
  res.status(201).json({ ...question, options: opts });
});

router.put("/quizzes/:quizId/questions/:questionId", authenticate, requireAdmin, async (req, res) => {
  const questionId = parseInt(req.params['questionId']! as string);
  const { questionText, type, explanation, orderIndex, points } = req.body;
  const [question] = await db.update(questionsTable).set({ questionText, type, explanation, orderIndex, points }).where(eq(questionsTable.id, questionId)).returning();
  if (!question) { res.status(404).json({ error: "Not found" }); return; }
  res.json(question);
});

router.delete("/quizzes/:quizId/questions/:questionId", authenticate, requireAdmin, async (req, res) => {
  await db.delete(questionsTable).where(eq(questionsTable.id, parseInt(req.params['questionId']! as string)));
  res.status(204).send();
});

router.post("/quizzes/:id/submit", authenticate, async (req, res) => {
  const quizId = parseInt(req.params['id']! as string);
  const userId = req.user!.userId;
  const { answers } = req.body as { answers: Record<number, number[]> };

  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, quizId)).limit(1);
  if (!quiz) { res.status(404).json({ error: "Not found" }); return; }

  const prevAttempts = await db.select().from(quizAttemptsTable).where(and(eq(quizAttemptsTable.userId, userId), eq(quizAttemptsTable.quizId, quizId)));
  if (prevAttempts.length >= quiz.maxAttempts) { res.status(400).json({ error: "Max attempts reached" }); return; }

  const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quizId));
  let score = 0;
  let maxScore = 0;
  const breakdown: Record<number, { correct: boolean; correctOptions: number[] }> = {};

  for (const q of questions) {
    maxScore += q.points;
    const correctOpts = await db.select().from(optionsTable).where(and(eq(optionsTable.questionId, q.id), eq(optionsTable.isCorrect, true)));
    const correctIds = new Set(correctOpts.map(o => o.id));
    const userAnswers = new Set((answers[q.id] ?? []).map(Number));
    const isCorrect = correctOpts.length === userAnswers.size && [...correctIds].every(id => userAnswers.has(id));
    if (isCorrect) score += q.points;
    breakdown[q.id] = { correct: isCorrect, correctOptions: [...correctIds] };
  }

  const passed = maxScore > 0 && (score / maxScore) * 100 >= quiz.passPercent;
  const [attempt] = await db.insert(quizAttemptsTable).values({ userId, quizId, score, maxScore, passed, answersJson: JSON.stringify(answers) }).returning();
  res.json({ id: attempt.id, score, maxScore, passed, breakdown, attemptedAt: attempt.attemptedAt, attemptsLeft: quiz.maxAttempts - prevAttempts.length - 1 });
});

router.get("/quizzes/:id/attempts", authenticate, async (req, res) => {
  const quizId = parseInt(req.params['id']! as string);
  const userId = req.user!.userId;
  const attempts = await db.select().from(quizAttemptsTable).where(and(eq(quizAttemptsTable.userId, userId), eq(quizAttemptsTable.quizId, quizId)));
  res.json(attempts);
});

export default router;
