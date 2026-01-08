import type { FastifyInstance } from "fastify";
import { buildTrend, computePayback } from "../services/trends.js";

export async function trendRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/trends", async (req) => {
    const q = req.query as { from?: string; to?: string; categoryId?: string };
    return buildTrend({
      from: q.from,
      to: q.to,
      categoryId: q.categoryId ? Number(q.categoryId) : undefined,
    });
  });

  app.get("/api/checkpoints/:id/payback", async (req, reply) => {
    const id = Number((req.params as any).id);
    const res = computePayback(id);
    if (!res) return reply.code(404).send({ error: "not_found" });
    return res;
  });
}
