import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const billSchema = z.object({
  name: z.string().trim().min(1),
  categoryId: z.number().int().nullish(),
  expectedAmount: z.number().int().nullish(),
  cadence: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]),
  split: z.record(z.string(), z.number()).nullish(),
  nextExpectedDate: z.string().nullish(),
  active: z.boolean().default(true),
});

export async function recurringBillRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/recurring-bills", async () =>
    db.select().from(schema.recurringBills).all());

  app.post("/api/recurring-bills", async (req) => {
    const body = billSchema.parse(req.body);
    const [row] = db.insert(schema.recurringBills).values({
      ...body,
      split: body.split ?? null,
      nextExpectedDate: body.nextExpectedDate ?? null,
    }).returning().all();
    return row;
  });

  app.patch("/api/recurring-bills/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = billSchema.partial().parse(req.body);
    db.update(schema.recurringBills).set(body as any).where(eq(schema.recurringBills.id, id)).run();
    const row = db.select().from(schema.recurringBills).where(eq(schema.recurringBills.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete("/api/recurring-bills/:id", async (req) => {
    const id = Number((req.params as any).id);
    db.delete(schema.recurringBills).where(eq(schema.recurringBills.id, id)).run();
    return { ok: true };
  });
}
