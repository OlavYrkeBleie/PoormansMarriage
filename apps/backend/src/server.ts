import Fastify from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import staticServe from "@fastify/static";
import cors from "@fastify/cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { env } from "./env.js";
import { runMigrations } from "./db/index.js";
import { seedDefaultsIfEmpty } from "./db/seed.js";
import authPlugin from "./auth/plugin.js";
import { authRoutes } from "./routes/auth.js";
import { cardRoutes } from "./routes/cards.js";
import { categoryRoutes } from "./routes/categories.js";
import { expenseRoutes } from "./routes/expenses.js";
import { receiptRoutes } from "./routes/receipts.js";
import { bankRoutes } from "./routes/bank.js";
import { merchantRoutes } from "./routes/merchants.js";
import { recurringBillRoutes } from "./routes/recurring.js";
import { settlementRoutes } from "./routes/settlements.js";
import { reportRoutes } from "./routes/reports.js";
import { exportRoutes } from "./routes/export.js";
import { checkpointRoutes } from "./routes/checkpoints.js";
import { trendRoutes } from "./routes/trends.js";
import { accessRoutes } from "./routes/access.js";

export async function build() {
  const app = Fastify({
    logger: { level: env.isProd ? "info" : "debug" },
    bodyLimit: 10 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: env.isProd ? false : ["http://localhost:5173"],
    credentials: true,
  });
  await app.register(cookie, { secret: env.JWT_SECRET });
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });
  await app.register(authPlugin);

  app.get("/api/health", async () => ({ ok: true, version: "0.9.0" }));

  await app.register(authRoutes);
  await app.register(cardRoutes);
  await app.register(categoryRoutes);
  await app.register(expenseRoutes);
  await app.register(receiptRoutes);
  await app.register(bankRoutes);
  await app.register(merchantRoutes);
  await app.register(recurringBillRoutes);
  await app.register(settlementRoutes);
  await app.register(reportRoutes);
  await app.register(exportRoutes);
  await app.register(checkpointRoutes);
  await app.register(trendRoutes);
  await app.register(accessRoutes);

  if (env.isProd) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(here, "../../frontend/dist"),
      path.resolve(here, "../../../apps/frontend/dist"),
    ];
    const frontendDist = candidates.find((p) => fs.existsSync(p));
    if (frontendDist) {
      await app.register(staticServe, { root: frontendDist, prefix: "/" });
      app.setNotFoundHandler((req, reply) => {
        if (req.url.startsWith("/api/")) return reply.code(404).send({ error: "not_found" });
        return reply.sendFile("index.html", frontendDist);
      });
    }
  }

  app.setErrorHandler((err, _req, reply) => {
    if ((err as any).statusCode) return reply.code((err as any).statusCode).send({ error: err.message });
    if ((err as any).name === "ZodError") return reply.code(400).send({ error: "validation_error", issues: (err as any).issues });
    app.log.error(err);
    reply.code(500).send({ error: "internal_error" });
  });

  return app;
}

async function main() {
  runMigrations();
  seedDefaultsIfEmpty();
  const app = await build();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`Poorman's Marriage listening on :${env.PORT}`);
  } catch (err: any) {
    if (err?.code === "EADDRINUSE") {
      console.error(`\nPort ${env.PORT} is already in use. Set PORT=<free-port> in .env (and update the proxy target in apps/frontend/vite.config.ts to match).\n`);
      process.exit(2);
    }
    throw err;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
