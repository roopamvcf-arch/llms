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

const readAllHandler = async (req: import("express").Request, res: import("express").Response) => {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.user!.userId));
  res.status(204).send();
};
router.post("/notifications/read-all", authenticate, readAllHandler);
router.put("/notifications/read-all", authenticate, readAllHandler);

const readHandler = async (req: import("express").Request, res: import("express").Response) => {
  const id = parseInt(req.params['id']! as string);
  await db.update(notificationsTable).set({ isRead: true }).where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.user!.userId)));
  res.status(204).send();
};
router.post("/notifications/:id/read", authenticate, readHandler);
router.put("/notifications/:id/read", authenticate, readHandler);

export default router;
