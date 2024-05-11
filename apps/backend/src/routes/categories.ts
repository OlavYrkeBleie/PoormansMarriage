import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const categorySchema = z.object({
  name: z.string().trim().min(1),
  group: z.enum(["FIXED", "MAINTENANCE", "DAILY", "OTHER"]),
  defaultSplit: z.record(z.string(), z.number().min(0).max(100)),
  requiresReceipt: z.boolean().default(true),
  icon: z.string().nullish(),
  color: z.string().nullish(),
});

export async function categoryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/categories", async () => db.select().from(schema.categories).all());

  app.post("/api/categories", async (req) => {
    const body = categorySchema.parse(req.body);
    const [row] = db.insert(schema.categories).values({
      ...body,
      icon: body.icon ?? null,
      color: body.color ?? null,
    }).returning().all();
    return row;
  });

  app.patch("/api/categories/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = categorySchema.partial().parse(req.body);
    db.update(schema.categories).set(body as any).where(eq(schema.categories.id, id)).run();
    const row = db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete("/api/categories/:id", async (req) => {
    const id = Number((req.params as any).id);
    db.delete(schema.categories).where(eq(schema.categories.id, id)).run();
    return { ok: true };
  });
}
