import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const cardSchema = z.object({
  ownerUserId: z.number().int().nullish(),
  label: z.string().trim().min(1).max(60),
  lastFour: z.string().regex(/^\d{4}$/).nullish(),
  isShared: z.boolean().default(false),
});

export async function cardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/cards", async () => db.select().from(schema.cards).all());

  app.post("/api/cards", async (req) => {
    const body = cardSchema.parse(req.body);
    const [row] = db.insert(schema.cards).values({
      ownerUserId: body.ownerUserId ?? null,
      label: body.label,
      lastFour: body.lastFour ?? null,
      isShared: body.isShared,
    }).returning().all();
    return row;
  });

  app.patch("/api/cards/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = cardSchema.partial().parse(req.body);
    db.update(schema.cards).set(body as any).where(eq(schema.cards.id, id)).run();
    const row = db.select().from(schema.cards).where(eq(schema.cards.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete("/api/cards/:id", async (req) => {
    const id = Number((req.params as any).id);
    db.delete(schema.cards).where(eq(schema.cards.id, id)).run();
    return { ok: true };
  });
}
