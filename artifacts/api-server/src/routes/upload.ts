import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

function fileUrl(req: import("express").Request, filename: string): string {
  const domain = process.env["REPLIT_DEV_DOMAIN"];
  if (domain) return `https://${domain}/api/uploads/${filename}`;
  return `${req.protocol}://${req.get("host")}/api/uploads/${filename}`;
}

router.post("/upload/video", authenticate, requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  res.json({ url: fileUrl(req, req.file.filename), filename: req.file.filename });
});

router.post("/upload/pdf", authenticate, requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  res.json({ url: fileUrl(req, req.file.filename), filename: req.file.filename });
});

router.post("/upload/thumbnail", authenticate, requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  res.json({ url: fileUrl(req, req.file.filename), filename: req.file.filename });
});

router.post("/upload/badge", authenticate, requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  res.json({ url: fileUrl(req, req.file.filename), filename: req.file.filename });
});

router.use("/uploads", (req, res, next) => {
  const filePath = path.join(uploadsDir, path.basename(req.path));
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Not found" }); return; }
  res.sendFile(filePath);
});

export default router;
