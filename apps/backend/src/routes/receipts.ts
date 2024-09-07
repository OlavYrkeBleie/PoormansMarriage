import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { env } from "../env.js";
import { runOcr } from "../services/ocr/worker.js";
import { parseReceipt } from "../services/ocr/parse.js";

export async function receiptRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.post("/api/receipts", async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "no_file" });

    const ext = path.extname(file.filename || ".jpg").toLowerCase() || ".jpg";
    const name = `${crypto.randomUUID()}${ext}`;
    const full = path.join(env.RECEIPTS_DIR, name);
    await fs.promises.writeFile(full, await file.toBuffer());

    const insertedRows = db.insert(schema.receipts).values({
      imagePath: path.join("receipts", name),
      uploadedByUserId: req.user!.sub,
      status: "PENDING_REVIEW",
    }).returning().all();
    const row = insertedRows[0]!;

    void processReceiptAsync(row.id, full);

    return row;
  });

  app.get("/api/receipts", async () => {
    return db.select().from(schema.receipts).all();
  });

  app.get("/api/receipts/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const row = db.select().from(schema.receipts).where(eq(schema.receipts.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  const confirmSchema = z.object({
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: z.number().int().positive(),
    merchantName: z.string().nullish(),
    categoryId: z.number().int().nullish(),
    cardId: z.number().int().nullish(),
    paidByUserId: z.number().int().nullish(),
    split: z.record(z.string(), z.number()),
    notes: z.string().nullish(),
  });

  app.post("/api/receipts/:id/confirm", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = confirmSchema.parse(req.body);

    const receipt = db.select().from(schema.receipts).where(eq(schema.receipts.id, id)).get();
    if (!receipt) return reply.code(404).send({ error: "not_found" });

    const [expense] = db.insert(schema.expenses).values({
      ...body,
      merchantName: body.merchantName ?? null,
      notes: body.notes ?? null,
      source: "RECEIPT_SCAN",
      receiptId: id,
    }).returning().all();

    db.update(schema.receipts).set({ status: "CONFIRMED" }).where(eq(schema.receipts.id, id)).run();
    return expense;
  });

  app.get("/api/receipts/:id/image", async (req, reply) => {
    const id = Number((req.params as any).id);
    const row = db.select().from(schema.receipts).where(eq(schema.receipts.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found" });
    const full = path.join(env.DATA_DIR, row.imagePath);
    if (!fs.existsSync(full)) return reply.code(404).send({ error: "missing_image" });
    return reply.type("image/jpeg").send(fs.createReadStream(full));
  });
}

async function processReceiptAsync(receiptId: number, imagePath: string) {
  try {
    const { text, confidence } = await runOcr(imagePath);
    const parsed = parseReceipt(text);
    db.update(schema.receipts).set({
      ocrText: text,
      ocrConfidence: Math.round(confidence),
      parsedTotal: parsed.total,
      parsedDate: parsed.date,
      parsedCardLastFour: parsed.cardLastFour,
      parsedMerchant: parsed.merchant,
    }).where(eq(schema.receipts.id, receiptId)).run();
  } catch (err) {
    console.error("[ocr] receipt", receiptId, "failed:", err);
  }
}
