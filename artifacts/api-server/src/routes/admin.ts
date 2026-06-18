import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, enrollmentsTable, coursesTable, auditLogTable, platformSettingsTable, notificationsTable, progressTable, modulesTable, lessonsTable, quizAttemptsTable } from "@workspace/db/schema";
import { eq, desc, count, and, ilike, sql } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router = Router();
const protect = [authenticate, requireAdmin] as const;

router.get("/admin/users", ...protect, async (req, res) => {
  const { search, role, page = "1", limit = "20" } = req.query as Record<string, string>;
  let query = db.select().from(usersTable).$dynamic();
  const conditions: any[] = [];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (search) conditions.push(ilike(usersTable.username, "%" + search + "%"));
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const users = await query.orderBy(desc(usersTable.createdAt)).limit(parseInt(limit)).offset(offset);
  const [{ value: total }] = await db.select({ value: count() }).from(usersTable);
  res.json({ users: users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, avatarColor: u.avatarColor, totpEnabled: u.totpEnabled, isActive: u.isActive, createdAt: u.createdAt, lastLogin: u.lastLogin })), total, page: parseInt(page), limit: parseInt(limit) });
});

router.post("/admin/users", ...protect, async (req, res) => {
  const { username, email, password, role } = req.body as { username: string; email?: string; password: string; role?: string };
  const hash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({ username, email, passwordHash: hash, role: (role as any) ?? "STUDENT" }).returning();
  await db.insert(auditLogTable).values({ userId: req.user!.userId, action: "CREATE_USER", detail: username });
  res.status(201).json({ id: user.id, username: user.username, email: user.email, role: user.role, avatarColor: user.avatarColor, totpEnabled: user.totpEnabled, isActive: user.isActive, createdAt: user.createdAt, lastLogin: user.lastLogin });
});

router.post("/admin/users/:id/suspend", ...protect, async (req, res) => {
  const id = parseInt(req.params['id']! as string);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(usersTable).set({ isActive: !user.isActive }).where(eq(usersTable.id, id));
  await db.insert(auditLogTable).values({ userId: req.user!.userId, action: user.isActive ? "SUSPEND_USER" : "ACTIVATE_USER", detail: user.username });
  res.status(204).send();
});

router.post("/admin/users/:id/enroll", ...protect, async (req, res) => {
  const userId = parseInt(req.params['id']! as string);
  const { courseId } = req.body as { courseId: number };
  const [existing] = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId))).limit(1);
  if (existing) { res.json({ message: "Already enrolled" }); return; }
  await db.insert(enrollmentsTable).values({ userId, courseId });
  await db.insert(notificationsTable).values({ userId, type: "ENROLLMENT", title: "Enrolled in Course", body: "You have been enrolled in a new course by an administrator.", actionRoute: "/student/courses" });
  res.status(201).json({ message: "Enrolled" });
});

router.get("/admin/users/:id/progress", ...protect, async (req, res) => {
  const userId = parseInt(req.params['id']! as string);
  const enrollments = await db.select({ courseId: enrollmentsTable.courseId, enrolledAt: enrollmentsTable.enrolledAt, completedAt: enrollmentsTable.completedAt, title: coursesTable.title }).from(enrollmentsTable).innerJoin(coursesTable, eq(coursesTable.id, enrollmentsTable.courseId)).where(eq(enrollmentsTable.userId, userId));
  const result = await Promise.all(enrollments.map(async (e) => {
    const mods = await db.select().from(modulesTable).where(eq(modulesTable.courseId, e.courseId));
    const allLessons = (await Promise.all(mods.map(m => db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id))))).flat();
    const done = await db.select().from(progressTable).where(and(eq(progressTable.userId, userId), eq(progressTable.completed, true)));
    const doneSet = new Set(done.map(p => p.lessonId));
    const progressPercent = allLessons.length > 0 ? Math.round((allLessons.filter(l => doneSet.has(l.id)).length / allLessons.length) * 100) : 0;
    return { ...e, progressPercent, totalLessons: allLessons.length };
  }));
  res.json(result);
});

router.get("/admin/analytics", ...protect, async (req, res) => {
  const [{ value: totalStudents }] = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.role, "STUDENT"));
  const [{ value: totalCourses }] = await db.select({ value: count() }).from(coursesTable);
  const [{ value: totalEnrollments }] = await db.select({ value: count() }).from(enrollmentsTable);
  const [{ value: totalQuizAttempts }] = await db.select({ value: count() }).from(quizAttemptsTable);
  res.json({ totalStudents, totalCourses, totalEnrollments, totalQuizAttempts });
});

router.get("/admin/analytics/courses", ...protect, async (req, res) => {
  const courses = await db.select({ id: coursesTable.id, title: coursesTable.title }).from(coursesTable).limit(20);
  const data = await Promise.all(courses.map(async (c) => {
    const [{ value: enrolled }] = await db.select({ value: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, c.id));
    const [{ value: completed }] = await db.select({ value: count() }).from(enrollmentsTable).where(and(eq(enrollmentsTable.courseId, c.id), sql`completed_at is not null`));
    return { ...c, enrolled, completed };
  }));
  res.json(data);
});

router.get("/admin/audit-log", ...protect, async (req, res) => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const logs = await db.select({ id: auditLogTable.id, action: auditLogTable.action, detail: auditLogTable.detail, timestamp: auditLogTable.timestamp, username: usersTable.username }).from(auditLogTable).leftJoin(usersTable, eq(usersTable.id, auditLogTable.userId)).orderBy(desc(auditLogTable.timestamp)).limit(parseInt(limit)).offset(offset);
  const [{ value: total }] = await db.select({ value: count() }).from(auditLogTable);
  res.json({ logs, total });
});

router.get("/admin/settings", ...protect, async (req, res) => {
  const rows = await db.select().from(platformSettingsTable);
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json({ platformName: settings["platformName"] ?? "CyberLearn", adminPanelEnabled: settings["adminPanelEnabled"] !== "false", maintenanceMode: settings["maintenanceMode"] === "true" });
});

router.put("/admin/settings", ...protect, async (req, res) => {
  const { platformName, adminPanelEnabled, maintenanceMode } = req.body;
  const upsert = async (key: string, value: string) => {
    const [existing] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, key)).limit(1);
    if (existing) await db.update(platformSettingsTable).set({ value }).where(eq(platformSettingsTable.key, key));
    else await db.insert(platformSettingsTable).values({ key, value });
  };
  if (platformName !== undefined) await upsert("platformName", platformName);
  if (adminPanelEnabled !== undefined) await upsert("adminPanelEnabled", String(adminPanelEnabled));
  if (maintenanceMode !== undefined) await upsert("maintenanceMode", String(maintenanceMode));
  res.status(204).send();
});

router.get("/admin/activity", ...protect, async (req, res) => {
  const logs = await db.select({ id: auditLogTable.id, action: auditLogTable.action, detail: auditLogTable.detail, timestamp: auditLogTable.timestamp, username: usersTable.username }).from(auditLogTable).leftJoin(usersTable, eq(usersTable.id, auditLogTable.userId)).orderBy(desc(auditLogTable.timestamp)).limit(10);
  res.json(logs);
});

export default router;
