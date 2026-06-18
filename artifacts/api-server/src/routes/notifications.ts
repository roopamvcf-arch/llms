import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.get("/notifications", authenticate, async (req, res) => {
  const notifications = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, req.user!.userId)).orderBy(desc(notificationsTable.createdAt)).limit(50);
  res.json(notifications);
});

router.post("/notifications/read-all", authenticate, async (req, res) => {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.user!.userId));
  res.status(204).send();
});

router.post("/notifications/:id/read", authenticate, async (req, res) => {
  const id = parseInt(req.params['id']! as string);
  await db.update(notificationsTable).set({ isRead: true }).where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.user!.userId)));
  res.status(204).send();
});

export default router;
