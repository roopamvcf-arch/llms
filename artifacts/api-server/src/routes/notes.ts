import { Router } from "express";
import { db } from "@workspace/db";
import { videoNotesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.get("/lessons/:id/notes", authenticate, async (req, res) => {
  const lessonId = parseInt(req.params['id']! as string);
  const notes = await db.select().from(videoNotesTable).where(and(eq(videoNotesTable.lessonId, lessonId), eq(videoNotesTable.userId, req.user!.userId)));
  res.json(notes);
});

router.post("/lessons/:id/notes", authenticate, async (req, res) => {
  const lessonId = parseInt(req.params['id']! as string);
  const { timestampSec, noteText } = req.body as { timestampSec: number; noteText: string };
  const [note] = await db.insert(videoNotesTable).values({ userId: req.user!.userId, lessonId, timestampSec, noteText }).returning();
  res.status(201).json(note);
});

router.delete("/lessons/:lessonId/notes/:noteId", authenticate, async (req, res) => {
  const noteId = parseInt(req.params['noteId']! as string);
  await db.delete(videoNotesTable).where(and(eq(videoNotesTable.id, noteId), eq(videoNotesTable.userId, req.user!.userId)));
  res.status(204).send();
});

export default router;
