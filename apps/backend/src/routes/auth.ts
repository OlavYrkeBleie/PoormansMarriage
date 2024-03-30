import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hash, verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { COOKIE_NAME, signSession } from "../auth/jwt.js";
import { env } from "../env.js";

const registerSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  password: z.string().min(6).max(200),
});

const loginSchema = z.object({
  displayName: z.string().trim().min(1),
  password: z.string().min(1),
});

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: env.isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const existing = db.select().from(schema.users).where(eq(schema.users.displayName, body.displayName)).get();
    if (existing) return reply.code(409).send({ error: "name_taken" });

    const passwordHash = await hash(body.password);
    const inserted = db.insert(schema.users).values({
      displayName: body.displayName,
      passwordHash,
    }).returning().all();
    const user = inserted[0]!;

    const token = signSession({ sub: user.id, name: user.displayName });
    reply.setCookie(COOKIE_NAME, token, cookieOpts());
    return { id: user.id, displayName: user.displayName };
  });

  app.post("/api/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = db.select().from(schema.users).where(eq(schema.users.displayName, body.displayName)).get();
    if (!user) return reply.code(401).send({ error: "invalid_credentials" });

    const ok = await verify(user.passwordHash, body.password);
    if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

    const token = signSession({ sub: user.id, name: user.displayName });
    reply.setCookie(COOKIE_NAME, token, cookieOpts());
    return { id: user.id, displayName: user.displayName };
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "unauthorized" });
    const user = db.select().from(schema.users).where(eq(schema.users.id, req.user.sub)).get();
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return { id: user.id, displayName: user.displayName };
  });

  app.get("/api/users", { preHandler: app.requireAuth }, async () => {
    const users = db.select({
      id: schema.users.id,
      displayName: schema.users.displayName,
    }).from(schema.users).all();
    return users;
  });
}
