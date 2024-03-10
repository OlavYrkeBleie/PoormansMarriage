import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../env.js";
import * as schema from "./schema.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

fs.mkdirSync(env.DATA_DIR, { recursive: true });
fs.mkdirSync(env.RECEIPTS_DIR, { recursive: true });

const sqlite = new Database(env.DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };

export function runMigrations() {
  const candidates = [
    path.resolve(HERE, "../../drizzle"),
    path.resolve(HERE, "../../../drizzle"),
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(process.cwd(), "apps/backend/drizzle"),
  ];
  const migrationsDir = candidates.find((d) => fs.existsSync(d));
  if (!migrationsDir) {
    console.warn("[db] no migrations dir found, skipping");
    return;
  }
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  sqlite.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER)`);
  const applied = new Set(
    sqlite.prepare("SELECT name FROM _migrations").all().map((r: any) => r.name),
  );
  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    sqlite.exec(sql);
    sqlite.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(f, Date.now());
    console.log(`[db] applied migration ${f}`);
  }
}
