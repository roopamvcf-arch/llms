import { Router } from "express";
import { db } from "@workspace/db";
import { badgesTable, userBadgesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router = Router();

router.get("/badges", authenticate, async (_req, res) => {
  const badges = await db.select().from(badgesTable);
  res.json(badges);
});

router.post("/badges", authenticate, requireAdmin, async (req, res) => {
  const { name, description, imageUrl, criteriaType, criteriaValue, colorHex } = req.body;
  const [badge] = await db.insert(badgesTable).values({ name, description, imageUrl, criteriaType, criteriaValue, colorHex: colorHex ?? "#22c55e" }).returning();
  res.status(201).json(badge);
});

router.put("/badges/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params['id']! as string);
  const { name, description, imageUrl, criteriaType, criteriaValue, colorHex } = req.body;
  const [badge] = await db.update(badgesTable).set({ name, description, imageUrl, criteriaType, criteriaValue, colorHex }).where(eq(badgesTable.id, id)).returning();
  if (!badge) { res.status(404).json({ error: "Not found" }); return; }
  res.json(badge);
});

router.delete("/badges/:id", authenticate, requireAdmin, async (req, res) => {
  await db.delete(badgesTable).where(eq(badgesTable.id, parseInt(req.params['id']! as string)));
  res.status(204).send();
});

router.get("/badges/mine", authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const userBadges = await db.select({ id: userBadgesTable.id, badgeId: userBadgesTable.badgeId, earnedAt: userBadgesTable.earnedAt, name: badgesTable.name, description: badgesTable.description, imageUrl: badgesTable.imageUrl, colorHex: badgesTable.colorHex, criteriaType: badgesTable.criteriaType }).from(userBadgesTable).innerJoin(badgesTable, eq(badgesTable.id, userBadgesTable.badgeId)).where(eq(userBadgesTable.userId, userId));
  res.json(userBadges);
});

export default router;
