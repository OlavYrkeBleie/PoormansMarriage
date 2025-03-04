import { db, schema } from "../db/index.js";

export function suggestCategoryFor(merchantName: string | null | undefined): number | null {
  if (!merchantName) return null;
  const rules = db.select().from(schema.merchants).all();
  const upper = merchantName.toUpperCase();
  for (const r of rules) {
    const pattern = r.namePattern.toUpperCase();
    if (pattern.startsWith("/") && pattern.endsWith("/")) {
      try {
        const rx = new RegExp(r.namePattern.slice(1, -1), "i");
        if (rx.test(merchantName)) return r.defaultCategoryId ?? null;
      } catch { /* bad regex, skip */ }
    } else if (upper.includes(pattern)) {
      return r.defaultCategoryId ?? null;
    }
  }
  return null;
}
