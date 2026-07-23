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

router.get("/upload/files", authenticate, requireAdmin, async (req, res) => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      res.json([]);
      return;
    }
    const files = await fs.promises.readdir(uploadsDir);
    const result = [];
    for (const file of files) {
      if (file.startsWith(".")) continue;
      const filePath = path.join(uploadsDir, file);
      const stat = await fs.promises.stat(filePath);
      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        let type: "video" | "pdf" | "image" | "other" = "other";
        if ([".mp4", ".webm", ".ogg"].includes(ext)) {
          type = "video";
        } else if (ext === ".pdf") {
          type = "pdf";
        } else if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
          type = "image";
        }
        result.push({
          filename: file,
          url: fileUrl(req, file),
          type,
          size: stat.size,
          createdAt: stat.birthtime,
        });
      }
    }
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to list uploads" });
  }
});

router.use("/uploads", (req, res, next) => {
  const filePath = path.join(uploadsDir, path.basename(req.path));
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Not found" }); return; }
  res.sendFile(filePath);
});

export default router;
