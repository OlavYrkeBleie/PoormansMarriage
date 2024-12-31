import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { adapterFor, BANKS } from "../services/bank/registry.js";
import { tryAutoMatch } from "../services/bank/reconcile.js";

export async function bankRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/bank/supported", async () =>
    BANKS.map((b) => ({ id: b.id, label: b.label })));

  app.post("/api/bank/import", async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "no_file" });
    const bank = (file.fields.bank as any)?.value ?? "sparebank1";
    const buf = await file.toBuffer();
    const text = buf.toString("utf8");

    let rows;
    try {
      rows = adapterFor(String(bank))(text);
    } catch (err: any) {
      return reply.code(400).send({ error: "parse_failed", detail: err.message });
    }

    let inserted = 0, skipped = 0, autoMatched = 0;

    for (const r of rows) {
      const hash = crypto.createHash("sha256")
        .update(`${r.transactionDate}|${r.amount}|${r.rawDescription}`)
        .digest("hex");

      const exists = db.select({ id: schema.bankTransactions.id })
        .from(schema.bankTransactions)
        .where(eq(schema.bankTransactions.dedupeHash, hash)).get();

      if (exists) { skipped++; continue; }

      const insertedRows = db.insert(schema.bankTransactions).values({
        importedFrom: file.filename ?? "upload.csv",
        transactionDate: r.transactionDate,
        amount: r.amount,
        rawDescription: r.rawDescription,
        cardLastFour: r.cardLastFour,
        dedupeHash: hash,
      }).returning().all();
      const row = insertedRows[0]!;

      inserted++;
      if (tryAutoMatch(row.id)) autoMatched++;
    }

    return { inserted, skipped, autoMatched, total: rows.length };
  });

  app.get("/api/bank/transactions", async (req) => {
    const status = (req.query as any)?.status as string | undefined;
    const q = db.select().from(schema.bankTransactions).orderBy(desc(schema.bankTransactions.transactionDate)).limit(500);
    const rows = status ? q.where(eq(schema.bankTransactions.matchStatus, status as any)).all() : q.all();
    return rows;
  });

  const actionSchema = z.object({
    action: z.enum(["attach_expense", "no_receipt_needed", "missing_receipt", "mark_auto"]),
    expenseId: z.number().int().optional(),
  });

  app.post("/api/bank/transactions/:id/action", async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = actionSchema.parse(req.body);
    const tx = db.select().from(schema.bankTransactions).where(eq(schema.bankTransactions.id, id)).get();
    if (!tx) return reply.code(404).send({ error: "not_found" });

    if (body.action === "attach_expense") {
      if (!body.expenseId) return reply.code(400).send({ error: "expense_id_required" });
      db.update(schema.bankTransactions).set({
        matchedExpenseId: body.expenseId,
        matchStatus: "MANUAL_MATCHED",
      }).where(eq(schema.bankTransactions.id, id)).run();
      db.update(schema.expenses).set({
        bankTransactionId: id, isReconciled: true,
      }).where(eq(schema.expenses.id, body.expenseId)).run();
    } else if (body.action === "no_receipt_needed") {
      db.update(schema.bankTransactions).set({ matchStatus: "NO_RECEIPT_REQUIRED" })
        .where(eq(schema.bankTransactions.id, id)).run();
    } else if (body.action === "missing_receipt") {
      db.update(schema.bankTransactions).set({ matchStatus: "MISSING_RECEIPT" })
        .where(eq(schema.bankTransactions.id, id)).run();
    }

    return db.select().from(schema.bankTransactions).where(eq(schema.bankTransactions.id, id)).get();
  });
}
