import { Router } from "express";
import { db } from "@workspace/db";
import { progressTable, quizAttemptsTable, enrollmentsTable, lessonsTable, modulesTable, userBadgesTable, certificatesTable } from "@workspace/db/schema";
import { eq, and, count, sum, inArray, isNotNull } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

async function getStreak(userId: number): Promise<number> {
  const records = await db
    .select({ lastAccessed: progressTable.lastAccessed })
    .from(progressTable)
    .where(eq(progressTable.userId, userId));
  
  if (records.length === 0) return 0;
  
  const dates = Array.from(
    new Set(records.map(r => r.lastAccessed.toISOString().slice(0, 10)))
  ).sort((a, b) => b.localeCompare(a));
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return 0;
  }
  
  let streak = 0;
  let currentStr = dates[0];
  let currentDate = new Date(currentStr);
  
  for (const dateStr of dates) {
    const diffTime = Math.abs(currentDate.getTime() - new Date(dateStr).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      streak++;
      currentDate = new Date(dateStr);
    } else {
      break;
    }
  }
  return streak;
}

router.get(["/users/me/analytics", "/analytics/me"], authenticate, async (req, res) => {
  const userId = req.user!.userId;

  const [{ value: enrolledCourses }] = await db
    .select({ value: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, userId));

  const [{ value: completedCourses }] = await db
    .select({ value: count() })
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, userId), isNotNull(enrollmentsTable.completedAt)));

  const [{ value: badgesEarned }] = await db
    .select({ value: count() })
    .from(userBadgesTable)
    .where(eq(userBadgesTable.userId, userId));

  const [{ value: certificatesEarned }] = await db
    .select({ value: count() })
    .from(certificatesTable)
    .where(eq(certificatesTable.userId, userId));

  const [{ value: totalWatched }] = await db
    .select({ value: sum(progressTable.watchedSeconds) })
    .from(progressTable)
    .where(eq(progressTable.userId, userId));
  const totalStudyHours = Number((Number(totalWatched ?? 0) / 3600).toFixed(1));

  const attempts = await db
    .select({ score: quizAttemptsTable.score, maxScore: quizAttemptsTable.maxScore })
    .from(quizAttemptsTable)
    .where(eq(quizAttemptsTable.userId, userId));
  const avgQuizScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0), 0) / attempts.length)
    : 0;

  // Completion Rate: percentage of completed lessons across all enrolled courses
  let totalLessonsAll = 0;
  let completedLessonsAll = 0;
  
  const enrollments = await db
    .select({ courseId: enrollmentsTable.courseId })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, userId));
  const enrolledCourseIds = enrollments.map(e => e.courseId);

  if (enrolledCourseIds.length > 0) {
    const allLessons = await db
      .select({ id: lessonsTable.id })
      .from(lessonsTable)
      .innerJoin(modulesTable, eq(modulesTable.id, lessonsTable.moduleId))
      .where(inArray(modulesTable.courseId, enrolledCourseIds));
    totalLessonsAll = allLessons.length;
    if (totalLessonsAll > 0) {
      const lessonIds = allLessons.map(l => l.id);
      const [{ value: doneCount }] = await db
        .select({ value: count() })
        .from(progressTable)
        .where(
          and(
            eq(progressTable.userId, userId),
            eq(progressTable.completed, true),
            inArray(progressTable.lessonId, lessonIds)
          )
        );
      completedLessonsAll = doneCount;
    }
  }
  const completionRate = totalLessonsAll > 0 ? Math.round((completedLessonsAll / totalLessonsAll) * 100) : 0;

  const streak = await getStreak(userId);

  res.json({
    totalStudyHours,
    avgQuizScore,
    completionRate,
    streak,
    totalCoursesEnrolled: enrolledCourses,
    completedCourses,
    badgesEarned,
    certificatesEarned
  });
});

router.get(["/users/me/analytics/study-time", "/analytics/me/study-time"], authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const records = await db.select({ watchedSeconds: progressTable.watchedSeconds, lastAccessed: progressTable.lastAccessed }).from(progressTable).where(eq(progressTable.userId, userId));
  const byDay: Record<string, number> = {};
  for (const r of records) {
    const day = r.lastAccessed.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + r.watchedSeconds;
  }
  const data = Object.entries(byDay).map(([date, seconds]) => ({ date, minutes: Math.round(seconds / 60) })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  res.json(data);
});

router.get(["/users/me/analytics/quiz-scores", "/analytics/me/quiz-scores"], authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const attempts = await db.select({ score: quizAttemptsTable.score, maxScore: quizAttemptsTable.maxScore, passed: quizAttemptsTable.passed, attemptedAt: quizAttemptsTable.attemptedAt }).from(quizAttemptsTable).where(eq(quizAttemptsTable.userId, userId)).limit(30);
  const data = attempts.map(a => ({ date: a.attemptedAt.toISOString().slice(0, 10), score: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0, passed: a.passed }));
  res.json(data);
});

export default router;
