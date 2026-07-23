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
  const { color, avatarColor } = req.body as { color?: string; avatarColor?: string };
  const finalColor = color ?? avatarColor;
  if (!finalColor) {
    res.status(400).json({ error: "color is required" });
    return;
  }
  const [user] = await db.update(usersTable).set({ avatarColor: finalColor }).where(eq(usersTable.id, req.user!.userId)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, avatarColor: user.avatarColor, totpEnabled: user.totpEnabled, isActive: user.isActive, createdAt: user.createdAt, lastLogin: user.lastLogin });
});

export default router;
