import type { FastifyInstance } from "fastify";
import { and, asc, gte, lte } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { db, schema } from "../db/index.js";

export async function exportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/api/export/csv", async (req, reply) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const rows = db.select().from(schema.expenses)
      .where(and(
        from ? gte(schema.expenses.occurredOn, from) : undefined,
        to ? lte(schema.expenses.occurredOn, to) : undefined,
      ))
      .orderBy(asc(schema.expenses.occurredOn))
      .all();

    const header = "id,occurred_on,amount_minor,currency,merchant_name,category_id,paid_by_user_id,source,notes\n";
    const body = rows.map((e) =>
      [e.id, e.occurredOn, e.amount, e.currency, csvEsc(e.merchantName), e.categoryId ?? "", e.paidByUserId ?? "", e.source, csvEsc(e.notes)].join(","),
    ).join("\n");

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="expenses-${from ?? "all"}-${to ?? "all"}.csv"`);
    return header + body + "\n";
  });

  app.get("/api/export/pdf", async (req, reply) => {
    const { month } = req.query as { month?: string };
    const m = month ?? new Date().toISOString().slice(0, 7);
    const from = `${m}-01`;
    const to = `${m}-31`;

    const rows = db.select().from(schema.expenses)
      .where(and(
        gte(schema.expenses.occurredOn, from),
        lte(schema.expenses.occurredOn, to),
      ))
      .orderBy(asc(schema.expenses.occurredOn))
      .all();

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    doc.fontSize(18).text("Monthly statement", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#666").text(`Period: ${m}`);
    doc.moveDown(1);
    doc.fillColor("#000").fontSize(10);

    if (rows.length === 0) {
      doc.text("(no expenses in this period)");
    } else {
      for (const r of rows) {
        const kr = (r.amount / 100).toFixed(2);
        doc.text(`${r.occurredOn}   ${(r.merchantName ?? "").padEnd(30).slice(0, 30)}   ${kr.padStart(10)} ${r.currency}`);
      }
      const total = rows.reduce((s, r) => s + r.amount, 0);
      doc.moveDown(1).fontSize(12).text(`Total: ${(total / 100).toFixed(2)} ${rows[0]?.currency ?? "NOK"}`);
    }
    doc.end();

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="statement-${m}.pdf"`);
    return reply.send(doc);
  });
}

function csvEsc(s: string | null | undefined): string {
  if (!s) return "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
