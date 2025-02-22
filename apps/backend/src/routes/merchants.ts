import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const merchantSchema = z.object({
  namePattern: z.string().trim().min(1),
  defaultCategoryId: z.number().int().nullish(),
});

export async function merchantRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/merchants", async () => db.select().from(schema.merchants).all());

  app.post("/api/merchants", async (req) => {
    const body = merchantSchema.parse(req.body);
    const [row] = db.insert(schema.merchants).values({
      namePattern: body.namePattern,
      defaultCategoryId: body.defaultCategoryId ?? null,
      learnedFromUserId: req.user!.sub,
    }).returning().all();
    return row;
  });

  app.delete("/api/merchants/:id", async (req) => {
    const id = Number((req.params as any).id);
    db.delete(schema.merchants).where(eq(schema.merchants.id, id)).run();
    return { ok: true };
  });
}
