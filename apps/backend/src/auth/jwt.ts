import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface SessionPayload {
  sub: number;
  name: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as unknown as SessionPayload;
    if (typeof decoded.sub !== "number") return null;
    return decoded;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "pm_session";
