import { Router } from "express";
import { db } from "@workspace/db";
import { enrollmentsTable, progressTable, coursesTable, userBadgesTable, badgesTable, notificationsTable, lessonsTable, modulesTable } from "@workspace/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.get("/dashboard/student", authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const enrollments = await db.select({ courseId: enrollmentsTable.courseId, title: coursesTable.title, thumbnailUrl: coursesTable.thumbnailUrl, difficulty: coursesTable.difficulty }).from(enrollmentsTable).innerJoin(coursesTable, eq(coursesTable.id, enrollmentsTable.courseId)).where(eq(enrollmentsTable.userId, userId));
  const coursesWithProgress = await Promise.all(enrollments.map(async (e) => {
    const mods = await db.select().from(modulesTable).where(eq(modulesTable.courseId, e.courseId));
    const allLessons = (await Promise.all(mods.map(m => db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id))))).flat();
    const [{ value: done }] = await db.select({ value: count() }).from(progressTable).where(and(eq(progressTable.userId, userId), eq(progressTable.completed, true)));
    const progressPercent = allLessons.length > 0 ? Math.round((done / allLessons.length) * 100) : 0;
    return { ...e, progressPercent, totalLessons: allLessons.length };
  }));
  const [{ value: completedLessons }] = await db.select({ value: count() }).from(progressTable).where(and(eq(progressTable.userId, userId), eq(progressTable.completed, true)));
  const [{ value: enrolledCourses }] = await db.select({ value: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.userId, userId));
  const recentBadges = await db.select({ id: userBadgesTable.id, name: badgesTable.name, imageUrl: badgesTable.imageUrl, colorHex: badgesTable.colorHex, earnedAt: userBadgesTable.earnedAt }).from(userBadgesTable).innerJoin(badgesTable, eq(badgesTable.id, userBadgesTable.badgeId)).where(eq(userBadgesTable.userId, userId)).orderBy(desc(userBadgesTable.earnedAt)).limit(5);
  const unreadNotifications = await db.select().from(notificationsTable).where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false))).limit(10);
  res.json({ enrolledCourses, completedLessons, courses: coursesWithProgress, recentBadges, unreadNotifications });
});

export default router;
