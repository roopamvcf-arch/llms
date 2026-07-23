import { Router } from "express";
import { db } from "@workspace/db";
import {
  enrollmentsTable,
  progressTable,
  coursesTable,
  userBadgesTable,
  badgesTable,
  notificationsTable,
  lessonsTable,
  modulesTable,
  certificatesTable,
  quizAttemptsTable
} from "@workspace/db/schema";
import { eq, and, count, desc, sum, inArray, isNotNull } from "drizzle-orm";
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

router.get(["/users/me/dashboard", "/dashboard/student"], authenticate, async (req, res) => {
  const userId = req.user!.userId;

  // 1. Get enrollments with course details
  const enrollments = await db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    thumbnailUrl: coursesTable.thumbnailUrl,
    difficulty: coursesTable.difficulty,
    category: coursesTable.category,
    isPublished: coursesTable.isPublished,
    createdAt: coursesTable.createdAt,
  }).from(enrollmentsTable)
    .innerJoin(coursesTable, eq(coursesTable.id, enrollmentsTable.courseId))
    .where(eq(enrollmentsTable.userId, userId));

  // 2. Compute course progress accurately
  const coursesWithProgress = await Promise.all(enrollments.map(async (e) => {
    const mods = await db.select().from(modulesTable).where(eq(modulesTable.courseId, e.id));
    const allLessons = (await Promise.all(mods.map(m => db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id))))).flat();
    const lessonIds = allLessons.map(l => l.id);
    
    let done = 0;
    if (lessonIds.length > 0) {
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
      done = doneCount;
    }
    const progressPercent = allLessons.length > 0 ? Math.round((done / allLessons.length) * 100) : 0;
    
    return {
      id: e.id,
      title: e.title,
      thumbnailUrl: e.thumbnailUrl,
      difficulty: e.difficulty,
      category: e.category,
      isPublished: e.isPublished,
      createdAt: e.createdAt.toISOString(),
      progressPercent,
      totalLessons: allLessons.length
    };
  }));

  // 3. Stats for StudentAnalytics
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
  const enrolledCourseIds = enrollments.map(e => e.id);
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

  const stats = {
    totalStudyHours,
    avgQuizScore,
    completionRate,
    streak,
    totalCoursesEnrolled: enrolledCourses,
    completedCourses,
    badgesEarned,
    certificatesEarned
  };

  // 4. Badges (nested)
  const rawBadges = await db
    .select({
      id: userBadgesTable.id,
      badgeId: userBadgesTable.badgeId,
      earnedAt: userBadgesTable.earnedAt,
      badgeName: badgesTable.name,
      badgeDescription: badgesTable.description,
      badgeImageUrl: badgesTable.imageUrl,
      badgeCriteriaType: badgesTable.criteriaType,
      badgeCriteriaValue: badgesTable.criteriaValue,
      badgeColorHex: badgesTable.colorHex,
    })
    .from(userBadgesTable)
    .innerJoin(badgesTable, eq(badgesTable.id, userBadgesTable.badgeId))
    .where(eq(userBadgesTable.userId, userId))
    .orderBy(desc(userBadgesTable.earnedAt))
    .limit(5);

  const recentBadges = rawBadges.map(rb => ({
    id: rb.id,
    badgeId: rb.badgeId,
    earnedAt: rb.earnedAt.toISOString(),
    badge: {
      id: rb.badgeId,
      name: rb.badgeName,
      description: rb.badgeDescription,
      imageUrl: rb.badgeImageUrl,
      criteriaType: rb.badgeCriteriaType,
      criteriaValue: rb.badgeCriteriaValue,
      colorHex: rb.badgeColorHex,
    }
  }));

  // 5. Notifications Count (Integer)
  const [{ value: unreadNotifications }] = await db
    .select({ value: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  res.json({
    stats,
    recentCourses: coursesWithProgress,
    recentBadges,
    streak,
    unreadNotifications
  });
});

export default router;
