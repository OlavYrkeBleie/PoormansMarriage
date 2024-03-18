import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

for (const dir of [process.cwd(), path.resolve(process.cwd(), "../.."), path.resolve(process.cwd(), "..")]) {
  const p = path.join(dir, ".env");
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
}

function need(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "3000", 10),
  JWT_SECRET: need("JWT_SECRET"),
  DATA_DIR,
  DB_PATH: path.join(DATA_DIR, "app.sqlite"),
  RECEIPTS_DIR: path.join(DATA_DIR, "receipts"),
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY ?? "NOK",
  OCR_LANGS: process.env.OCR_LANGS ?? "nor+eng",
  isProd: process.env.NODE_ENV === "production",
} as const;
