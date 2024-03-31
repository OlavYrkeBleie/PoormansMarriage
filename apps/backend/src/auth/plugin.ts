import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { COOKIE_NAME, verifySession, type SessionPayload } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    user: SessionPayload | null;
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("user", null);

  app.addHook("onRequest", async (req) => {
    const token = req.cookies[COOKIE_NAME];
    req.user = token ? verifySession(token) : null;
  });

  app.decorate("requireAuth", async (req: FastifyRequest) => {
    if (!req.user) {
      const err: any = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest) => Promise<void>;
  }
}
