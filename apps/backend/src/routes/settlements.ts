import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { computeSettlement } from "../services/settlement.js";

const periodSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function settlementRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.post("/api/settlements/preview", async (req) => {
    const { periodStart, periodEnd } = periodSchema.parse(req.body);
    return computeSettlement(periodStart, periodEnd);
  });

  app.post("/api/settlements", async (req, reply) => {
    const { periodStart, periodEnd } = periodSchema.parse(req.body);
    const proposal = computeSettlement(periodStart, periodEnd);
    if (!proposal.fromUserId || !proposal.toUserId || proposal.amount === 0) {
      return reply.code(400).send({ error: "nothing_to_settle" });
    }
    const [row] = db.insert(schema.settlements).values({
      periodStart, periodEnd,
      fromUserId: proposal.fromUserId,
      toUserId: proposal.toUserId,
      amount: proposal.amount,
    }).returning().all();
    return row;
  });

  app.post("/api/settlements/:id/mark-paid", async (req, reply) => {
    const id = Number((req.params as any).id);
    db.update(schema.settlements).set({
      status: "SETTLED",
      settledAt: new Date(),
    }).where(eq(schema.settlements.id, id)).run();
    const row = db.select().from(schema.settlements).where(eq(schema.settlements.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.get("/api/settlements", async () =>
    db.select().from(schema.settlements).orderBy(desc(schema.settlements.createdAt)).all());
}
