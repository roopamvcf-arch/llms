import { Router } from "express";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
} from "../lib/jwt";
import { authenticate } from "../middlewares/authenticate";

const router = Router();
const ACCESS_SECRET = process.env["SESSION_SECRET"] ?? "change-me-in-prod";
const TEMP_TOKEN_EXPIRES = "5m";

function setRefreshCookie(res: import("express").Response, token: string) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
}

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    res.status(401).json({ error: "Account locked. Try again later." });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const fails = (user.failedLogins ?? 0) + 1;
    const lockout = fails >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await db.update(usersTable).set({ failedLogins: fails, lockoutUntil: lockout }).where(eq(usersTable.id, user.id));
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  await db.update(usersTable).set({ failedLogins: 0, lockoutUntil: null, lastLogin: new Date() }).where(eq(usersTable.id, user.id));

  if (user.role === "ADMIN" && user.totpEnabled) {
    const tempToken = jwt.sign({ userId: user.id, step: "totp" }, ACCESS_SECRET, { expiresIn: TEMP_TOKEN_EXPIRES });
    res.json({ step: "totp_required", tempToken, accessToken: null, user: null });
    return;
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refresh = generateRefreshToken();
  await db.insert(sessionsTable).values({ userId: user.id, refreshTokenHash: hashRefreshToken(refresh), expiresAt: refreshExpiresAt() });
  setRefreshCookie(res, refresh);
  res.json({
    step: "done",
    accessToken,
    user: {
      id: user.id, username: user.username, email: user.email, role: user.role,
      avatarColor: user.avatarColor, totpEnabled: user.totpEnabled, isActive: user.isActive,
      createdAt: user.createdAt, lastLogin: user.lastLogin,
    },
    tempToken: null,
  });
});

router.post(["/auth/verify-totp", "/auth/totp"], async (req, res) => {
  const { tempToken, totpCode, code } = req.body as { tempToken: string; totpCode?: string; code?: string };
  const actualCode = totpCode ?? code;
  if (!actualCode) {
    res.status(400).json({ error: "totpCode is required" });
    return;
  }
  let payload: { userId: number; step: string };
  try {
    payload = jwt.verify(tempToken, ACCESS_SECRET) as typeof payload;
  } catch {
    res.status(401).json({ error: "Invalid or expired temp token" });
    return;
  }
  if (payload.step !== "totp") {
    res.status(401).json({ error: "Invalid token step" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user || !user.totpSecret) {
    res.status(401).json({ error: "TOTP not configured" });
    return;
  }
  const valid = speakeasy.totp.verify({ secret: user.totpSecret, encoding: "base32", token: actualCode, window: 1 });
  if (!valid) {
    res.status(401).json({ error: "Invalid TOTP code" });
    return;
  }
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refresh = generateRefreshToken();
  await db.insert(sessionsTable).values({ userId: user.id, refreshTokenHash: hashRefreshToken(refresh), expiresAt: refreshExpiresAt() });
  setRefreshCookie(res, refresh);
  res.json({ accessToken, user: { id: user.id, username: user.username, email: user.email, role: user.role, avatarColor: user.avatarColor, totpEnabled: user.totpEnabled, isActive: user.isActive, createdAt: user.createdAt, lastLogin: user.lastLogin } });
});

router.post("/auth/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }
  const hash = hashRefreshToken(token);
  const now = new Date();
  const [session] = await db.select().from(sessionsTable).where(and(eq(sessionsTable.refreshTokenHash, hash), gt(sessionsTable.expiresAt, now))).limit(1);
  if (!session) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const newRefresh = generateRefreshToken();
  await db.update(sessionsTable).set({ refreshTokenHash: hashRefreshToken(newRefresh), expiresAt: refreshExpiresAt() }).where(eq(sessionsTable.id, session.id));
  setRefreshCookie(res, newRefresh);
  res.json({ accessToken: signAccessToken({ userId: user.id, role: user.role }) });
});

router.post("/auth/logout", authenticate, async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.refreshTokenHash, hashRefreshToken(token)));
  }
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.status(204).send();
});

router.get("/auth/me", authenticate, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, avatarColor: user.avatarColor, totpEnabled: user.totpEnabled, isActive: user.isActive, createdAt: user.createdAt, lastLogin: user.lastLogin });
});

router.post(["/auth/setup-totp", "/auth/totp/setup"], authenticate, async (req, res) => {
  const secret = speakeasy.generateSecret({ name: `CyberLearn (${req.user!.userId})` });
  await db.update(usersTable).set({ totpSecret: secret.base32, totpEnabled: false }).where(eq(usersTable.id, req.user!.userId));
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url ?? "");
  res.json({ secret: secret.base32, qrCodeDataUrl });
});

router.post(["/auth/change-password", "/auth/password"], authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Wrong password" }); return; }
  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, user.id));
  res.status(204).send();
});

export default router;
