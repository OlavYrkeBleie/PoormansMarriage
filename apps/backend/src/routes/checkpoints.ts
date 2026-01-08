import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const checkpointSchema = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().trim().min(1).max(120),
  amount: z.number().int(),
  categoryId: z.number().int().nullish(),
  notes: z.string().nullish(),
});

export async function checkpointRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/checkpoints", async () =>
    db.select().from(schema.checkpoints).orderBy(asc(schema.checkpoints.occurredOn)).all());

  app.post("/api/checkpoints", async (req) => {
    const body = checkpointSchema.parse(req.body);
    const [row] = db.insert(schema.checkpoints).values({
      occurredOn: body.occurredOn,
      label: body.label,
      amount: body.amount,
      categoryId: body.categoryId ?? null,
      notes: body.notes ?? null,
    }).returning().all();
    return row;
  });

  app.patch("/api/checkpoints/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = checkpointSchema.partial().parse(req.body);
    db.update(schema.checkpoints).set(body as any).where(eq(schema.checkpoints.id, id)).run();
    const row = db.select().from(schema.checkpoints).where(eq(schema.checkpoints.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete("/api/checkpoints/:id", async (req) => {
    const id = Number((req.params as any).id);
    db.delete(schema.checkpoints).where(eq(schema.checkpoints.id, id)).run();
    return { ok: true };
  });
}
