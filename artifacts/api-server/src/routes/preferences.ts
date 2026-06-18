import { Router } from "express";
import { db } from "@workspace/db";
import { userPreferencesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.get("/users/me/preferences", authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId)).limit(1);
  if (!prefs) {
    const [created] = await db.insert(userPreferencesTable).values({ userId }).returning();
    res.json(created); return;
  }
  res.json(prefs);
});

router.put("/users/me/preferences", authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const { theme, fontSize, language } = req.body;
  const [existing] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId)).limit(1);
  if (existing) {
    const [updated] = await db.update(userPreferencesTable).set({ theme, fontSize, language }).where(eq(userPreferencesTable.userId, userId)).returning();
    res.json(updated); return;
  }
  const [created] = await db.insert(userPreferencesTable).values({ userId, theme, fontSize, language }).returning();
  res.json(created);
});

router.put("/users/me/avatar-color", authenticate, async (req, res) => {
  const { avatarColor } = req.body as { avatarColor: string };
  await db.update(usersTable).set({ avatarColor }).where(eq(usersTable.id, req.user!.userId));
  res.status(204).send();
});

export default router;
