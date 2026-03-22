import type { FastifyInstance } from "fastify";
import os from "node:os";
import QRCode from "qrcode";
import { env } from "../env.js";

function lanAddresses(): string[] {
  const out: string[] = [];
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const info of ifs[name] ?? []) {
      if (info.family !== "IPv4" || info.internal) continue;
      out.push(info.address);
    }
  }
  return out;
}

export async function accessRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/access", async () => {
    const addrs = lanAddresses();
    const urls = addrs.map((a) => `http://${a}:${env.PORT}/`);
    return {
      port: env.PORT,
      lanAddresses: addrs,
      lanUrls: urls,
      preferredUrl: urls[0] ?? `http://127.0.0.1:${env.PORT}/`,
    };
  });

  app.get("/api/access/qr", async (req, reply) => {
    const url = (req.query as { url?: string }).url
      ?? `http://${lanAddresses()[0] ?? "127.0.0.1"}:${env.PORT}/`;
    const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 300 });
    reply.type("image/svg+xml").send(svg);
  });
}
