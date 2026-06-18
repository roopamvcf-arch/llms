import { Router } from "express";
import { db } from "@workspace/db";
import { certificatesTable, coursesTable, usersTable, enrollmentsTable, progressTable, lessonsTable, modulesTable } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";
import { generateCertHash } from "../lib/jwt";
import { notificationsTable } from "@workspace/db/schema";

const router = Router();

router.get("/certificates/mine", authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const certs = await db.select({ id: certificatesTable.id, userId: certificatesTable.userId, courseId: certificatesTable.courseId, issuedAt: certificatesTable.issuedAt, certHash: certificatesTable.certHash, pdfUrl: certificatesTable.pdfUrl, courseName: coursesTable.title }).from(certificatesTable).innerJoin(coursesTable, eq(coursesTable.id, certificatesTable.courseId)).where(eq(certificatesTable.userId, userId));
  const result = certs.map(c => ({ ...c, studentName: "" }));
  res.json(result);
});

router.post("/certificates", authenticate, async (req, res) => {
  const { courseId } = req.body as { courseId: number };
  const userId = req.user!.userId;

  const [enrollment] = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.userId, userId), eq(enrollmentsTable.courseId, courseId))).limit(1);
  if (!enrollment) { res.status(400).json({ error: "Not enrolled" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const mods = await db.select().from(modulesTable).where(eq(modulesTable.courseId, courseId));
  const allLessons = (await Promise.all(mods.map(m => db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, m.id))))).flat();
  const [{ value: completedCount }] = await db.select({ value: count() }).from(progressTable).where(and(eq(progressTable.userId, userId), eq(progressTable.completed, true)));
  const totalLessons = allLessons.length;
  if (totalLessons > 0 && completedCount < totalLessons) { res.status(400).json({ error: "Course not completed" }); return; }

  const [existing] = await db.select().from(certificatesTable).where(and(eq(certificatesTable.userId, userId), eq(certificatesTable.courseId, courseId))).limit(1);
  if (existing) { res.json({ ...existing, courseName: course.title, studentName: "" }); return; }

  const certHash = generateCertHash();
  const [cert] = await db.insert(certificatesTable).values({ userId, courseId, certHash }).returning();

  await db.insert(notificationsTable).values({ userId, type: "CERTIFICATE", title: "Certificate Earned!", body: `You earned a certificate for "${course.title}"`, actionRoute: "/student/certificates" });

  res.status(201).json({ ...cert, courseName: course.title, studentName: "" });
});

router.get("/certificates/verify/:hash", async (req, res) => {
  const [cert] = await db.select({ id: certificatesTable.id, issuedAt: certificatesTable.issuedAt, certHash: certificatesTable.certHash, courseName: coursesTable.title, userId: certificatesTable.userId, courseId: certificatesTable.courseId }).from(certificatesTable).innerJoin(coursesTable, eq(coursesTable.id, certificatesTable.courseId)).where(eq(certificatesTable.certHash, req.params['hash']! as string)).limit(1);
  if (!cert) { res.status(404).json({ error: "Certificate not found", valid: false }); return; }
  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, cert.userId)).limit(1);
  res.json({ ...cert, valid: true, studentName: user?.username ?? "" });
});

export default router;
