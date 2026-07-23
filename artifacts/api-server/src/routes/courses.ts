import { Router } from "express";
import { db } from "@workspace/db";
import { coursesTable, modulesTable, lessonsTable, enrollmentsTable, progressTable } from "@workspace/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";
import { auditLogTable } from "@workspace/db/schema";

const router = Router();

function courseToJson(c: typeof coursesTable.$inferSelect) {
  return { id: c.id, title: c.title, description: c.description, thumbnailUrl: c.thumbnailUrl, category: c.category, difficulty: c.difficulty, isPublished: c.isPublished, createdAt: c.createdAt };
}

router.get("/courses", authenticate, async (req, res) => {
  const { search, difficulty, category, page = "1", limit = "20" } = req.query as Record<string, string>;
  const isAdmin = req.user!.role === "ADMIN";
  let query = db.select().from(coursesTable).$dynamic();
  const conditions = [];
  if (!isAdmin) conditions.push(eq(coursesTable.isPublished, true));
  if (difficulty) conditions.push(eq(coursesTable.difficulty, difficulty as any));
  if (category) conditions.push(eq(coursesTable.category, category));
  if (search) conditions.push(sql`lower(${coursesTable.title}) like ${"%" + search.toLowerCase() + "%"}`);
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const courses = await query.orderBy(desc(coursesTable.createdAt)).limit(parseInt(limit)).offset(offset);

  const enriched = await Promise.all(courses.map(async (c) => {
    const [{ value: totalLessons }] = await db.select({ value: count() }).from(lessonsTable)
      .innerJoin(modulesTable, eq(modulesTable.id, lessonsTable.moduleId))
      .where(eq(modulesTable.courseId, c.id));
    const [{ value: enrolledCount }] = await db.select({ value: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, c.id));
    let progressPercent = 0;
    if (!isAdmin) {
      const [enrollment] = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.userId, req.user!.userId), eq(enrollmentsTable.courseId, c.id))).limit(1);
      if (enrollment && totalLessons > 0) {
        const [{ value: completed }] = await db.select({ value: count() }).from(progressTable)
          .innerJoin(lessonsTable, eq(lessonsTable.id, progressTable.lessonId))
          .innerJoin(modulesTable, eq(modulesTable.id, lessonsTable.moduleId))
          .where(and(eq(progressTable.userId, req.user!.userId), eq(modulesTable.courseId, c.id), eq(progressTable.completed, true)));
        progressPercent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
      }
    }
    return { ...courseToJson(c), totalLessons, enrolledCount, progressPercent, totalDurationSeconds: 0 };
  }));
  res.json(enriched);
});

router.post("/courses", authenticate, requireAdmin, async (req, res) => {
  const { title, description, thumbnailUrl, category, difficulty } = req.body;
  const [course] = await db.insert(coursesTable).values({ title, description, thumbnailUrl, category, difficulty: difficulty ?? "BEGINNER", createdById: req.user!.userId }).returning();
  await db.insert(auditLogTable).values({ userId: req.user!.userId, action: "CREATE_COURSE", detail: title });
  res.status(201).json(courseToJson(course));
});

router.get("/courses/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params['id']! as string);
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  if (!course) { res.status(404).json({ error: "Not found" }); return; }
  if (!course.isPublished && req.user!.role !== "ADMIN") { res.status(404).json({ error: "Not found" }); return; }
  const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, id)).orderBy(modulesTable.orderIndex);
  const modulesWithLessons = await Promise.all(modules.map(async (m) => {
    const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id)).orderBy(lessonsTable.orderIndex);
    return { ...m, lessons };
  }));
  const [{ value: enrolledCount }] = await db.select({ value: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, id));
  res.json({ ...courseToJson(course), modules: modulesWithLessons, enrolledCount });
});

router.put("/courses/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params['id']! as string);
  const { title, description, thumbnailUrl, category, difficulty, isPublished } = req.body;
  const [updated] = await db.update(coursesTable).set({ title, description, thumbnailUrl, category, difficulty, isPublished }).where(eq(coursesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(courseToJson(updated));
});

router.delete("/courses/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params['id']! as string);
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.status(204).send();
});

router.get("/courses/:id/progress", authenticate, async (req, res) => {
  const courseId = parseInt(req.params['id']! as string);
  const userId = req.user!.userId;
  const [enrollment] = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId))).limit(1);
  const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, courseId));
  const allLessons = (await Promise.all(modules.map(m => db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id))))).flat();
  const completedRecords = enrollment ? await db.select().from(progressTable).where(and(eq(progressTable.userId, userId), eq(progressTable.completed, true))) : [];
  const completedIds = new Set(completedRecords.map(p => p.lessonId));
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter(l => completedIds.has(l.id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  res.json({ enrolled: !!enrollment, progressPercent, completedLessons, totalLessons, completedAt: enrollment?.completedAt ?? null });
});

router.post("/courses/:id/enroll", authenticate, async (req, res) => {
  const courseId = parseInt(req.params['id']! as string);
  const userId = req.user!.userId;
  const [existing] = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId))).limit(1);
  if (existing) { res.json({ message: "Already enrolled", enrolledAt: existing.enrolledAt }); return; }
  const [enrollment] = await db.insert(enrollmentsTable).values({ userId, courseId }).returning();
  res.status(201).json({ message: "Enrolled", enrolledAt: enrollment.enrolledAt });
});

router.get("/courses/:courseId/modules", authenticate, async (req, res) => {
  const courseId = parseInt(req.params['courseId']! as string);
  const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, courseId)).orderBy(modulesTable.orderIndex);
  const result = await Promise.all(modules.map(async (m) => {
    const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id)).orderBy(lessonsTable.orderIndex);
    return { ...m, lessons };
  }));
  res.json(result);
});

router.post("/courses/:courseId/modules", authenticate, requireAdmin, async (req, res) => {
  const courseId = parseInt(req.params['courseId']! as string);
  const { title, description, orderIndex } = req.body;
  const [mod] = await db.insert(modulesTable).values({ courseId, title, description, orderIndex: orderIndex ?? 0 }).returning();
  res.status(201).json(mod);
});

router.put(["/modules/:id", "/courses/:courseId/modules/:moduleId"], authenticate, requireAdmin, async (req, res) => {
  const moduleId = parseInt((req.params['id'] ?? req.params['moduleId'])! as string);
  const { title, description, orderIndex } = req.body;
  const [mod] = await db.update(modulesTable).set({ title, description, orderIndex }).where(eq(modulesTable.id, moduleId)).returning();
  if (!mod) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mod);
});

router.delete(["/modules/:id", "/courses/:courseId/modules/:moduleId"], authenticate, requireAdmin, async (req, res) => {
  const moduleId = parseInt((req.params['id'] ?? req.params['moduleId'])! as string);
  await db.delete(modulesTable).where(eq(modulesTable.id, moduleId));
  res.status(204).send();
});

router.post(["/modules/:moduleId/lessons", "/courses/:courseId/modules/:moduleId/lessons"], authenticate, requireAdmin, async (req, res) => {
  const moduleId = parseInt(req.params['moduleId']! as string);
  const { title, type, contentUrl, durationSeconds, orderIndex } = req.body;
  const [lesson] = await db.insert(lessonsTable).values({ moduleId, title, type, contentUrl, durationSeconds: durationSeconds ?? 0, orderIndex: orderIndex ?? 0 }).returning();
  res.status(201).json(lesson);
});

router.put(["/lessons/:id", "/courses/:courseId/modules/:moduleId/lessons/:lessonId"], authenticate, requireAdmin, async (req, res) => {
  const lessonId = parseInt((req.params['id'] ?? req.params['lessonId'])! as string);
  const { title, type, contentUrl, durationSeconds, orderIndex } = req.body;
  const [lesson] = await db.update(lessonsTable).set({ title, type, contentUrl, durationSeconds, orderIndex }).where(eq(lessonsTable.id, lessonId)).returning();
  if (!lesson) { res.status(404).json({ error: "Not found" }); return; }
  res.json(lesson);
});

router.delete(["/lessons/:id", "/courses/:courseId/modules/:moduleId/lessons/:lessonId"], authenticate, requireAdmin, async (req, res) => {
  const lessonId = parseInt((req.params['id'] ?? req.params['lessonId'])! as string);
  await db.delete(lessonsTable).where(eq(lessonsTable.id, lessonId));
  res.status(204).send();
});

router.post(["/lessons/:id/complete", "/courses/:courseId/modules/:moduleId/lessons/:lessonId/complete"], authenticate, async (req, res) => {
  const lessonId = parseInt((req.params['id'] ?? req.params['lessonId'])! as string);
  const userId = req.user!.userId;
  const { watchedSeconds } = req.body as { watchedSeconds?: number };
  const [existing] = await db.select().from(progressTable).where(and(eq(progressTable.userId, userId), eq(progressTable.lessonId, lessonId))).limit(1);
  let record;
  if (existing) {
    [record] = await db.update(progressTable).set({ watchedSeconds: watchedSeconds ?? existing.watchedSeconds, completed: true, lastAccessed: new Date() }).where(eq(progressTable.id, existing.id)).returning();
  } else {
    [record] = await db.insert(progressTable).values({ userId, lessonId, watchedSeconds: watchedSeconds ?? 0, completed: true }).returning();
  }
  res.json({ lessonId, completed: true, watchedSeconds: record.watchedSeconds });
});

export default router;
