import type { FastifyInstance } from "fastify";
import { and, gte, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/reports/summary", async (req) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const rows = db.select().from(schema.expenses)
      .where(and(
        from ? gte(schema.expenses.occurredOn, from) : undefined,
        to ? lte(schema.expenses.occurredOn, to) : undefined,
      )).all();

    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    let total = 0;

    const cats = db.select().from(schema.categories).all();
    const catName = new Map(cats.map((c) => [c.id, c.name]));

    for (const e of rows) {
      if (e.excluded) continue;
      const cat = e.categoryId ? catName.get(e.categoryId) ?? "Uncategorized" : "Uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + e.amount;
      const month = e.occurredOn.slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + e.amount;
      total += e.amount;
    }

    return {
      total,
      count: rows.length,
      byCategory: Object.entries(byCategory).map(([name, amount]) => ({ name, amount })),
      byMonth: Object.entries(byMonth).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month)),
    };
  });
}
