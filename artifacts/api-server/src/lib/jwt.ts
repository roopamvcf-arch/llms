import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env["SESSION_SECRET"] ?? "change-me-in-prod";
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES_DAYS = 7;

export interface AccessTokenPayload {
  userId: number;
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_EXPIRES_DAYS);
  return d;
}

export function generateCertHash(): string {
  return crypto.randomBytes(32).toString("hex");
}
