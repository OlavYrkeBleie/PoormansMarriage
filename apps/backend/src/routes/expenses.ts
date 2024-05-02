import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const splitSchema = z.record(z.string(), z.number().min(0).max(100));

const upsertSchema = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().positive(),
  currency: z.string().default("NOK"),
  merchantName: z.string().nullish(),
  categoryId: z.number().int().nullish(),
  cardId: z.number().int().nullish(),
  paidByUserId: z.number().int().nullish(),
  split: splitSchema,
  source: z.enum(["RECEIPT_SCAN", "BANK_IMPORT", "MANUAL", "RECURRING_BILL"]).default("MANUAL"),
  receiptId: z.number().int().nullish(),
  bankTransactionId: z.number().int().nullish(),
  notes: z.string().nullish(),
  excluded: z.boolean().optional(),
});

const listQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.coerce.number().int().optional(),
  userId: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export async function expenseRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/expenses", async (req) => {
    const q = listQuery.parse(req.query);
    const conditions = [];
    if (q.from) conditions.push(gte(schema.expenses.occurredOn, q.from));
    if (q.to) conditions.push(lte(schema.expenses.occurredOn, q.to));
    if (q.categoryId) conditions.push(eq(schema.expenses.categoryId, q.categoryId));
    if (q.userId) conditions.push(eq(schema.expenses.paidByUserId, q.userId));

    const rows = db.select().from(schema.expenses)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.expenses.occurredOn))
      .limit(q.limit)
      .all();
    return rows;
  });

  app.get("/api/expenses/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const row = db.select().from(schema.expenses).where(eq(schema.expenses.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.post("/api/expenses", async (req, reply) => {
    const body = upsertSchema.parse(req.body);
    const sum = Object.values(body.split).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) return reply.code(400).send({ error: "split_must_sum_100" });

    const [row] = db.insert(schema.expenses).values({
      ...body,
      merchantName: body.merchantName ?? null,
      notes: body.notes ?? null,
    }).returning().all();
    return row;
  });

  app.patch("/api/expenses/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = upsertSchema.partial().parse(req.body);
    if (body.split) {
      const sum = Object.values(body.split).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.01) return reply.code(400).send({ error: "split_must_sum_100" });
    }
    db.update(schema.expenses).set({ ...body, updatedAt: new Date() }).where(eq(schema.expenses.id, id)).run();
    const row = db.select().from(schema.expenses).where(eq(schema.expenses.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete("/api/expenses/:id", async (req) => {
    const id = Number((req.params as any).id);
    db.delete(schema.expenses).where(eq(schema.expenses.id, id)).run();
    return { ok: true };
  });

  app.get("/api/expenses/balance", async () => {
    const rows = db.select().from(schema.expenses).where(eq(schema.expenses.excluded, false)).all();
    const users = db.select({ id: schema.users.id, displayName: schema.users.displayName }).from(schema.users).all();

    const paid: Record<number, number> = {};
    const owed: Record<number, number> = {};
    for (const u of users) { paid[u.id] = 0; owed[u.id] = 0; }

    for (const e of rows) {
      if (e.paidByUserId != null) paid[e.paidByUserId] = (paid[e.paidByUserId] ?? 0) + e.amount;
      for (const [uid, pct] of Object.entries(e.split)) {
        const k = Number(uid);
        owed[k] = (owed[k] ?? 0) + Math.round(e.amount * (pct / 100));
      }
    }

    return users.map((u) => ({
      userId: u.id,
      displayName: u.displayName,
      paid: paid[u.id] ?? 0,
      owed: owed[u.id] ?? 0,
      net: (paid[u.id] ?? 0) - (owed[u.id] ?? 0),
    }));
  });
}
