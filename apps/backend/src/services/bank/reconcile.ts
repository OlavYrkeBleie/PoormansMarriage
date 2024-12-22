import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "../../db/index.js";

export function tryAutoMatch(txId: number): boolean {
  const tx = db.select().from(schema.bankTransactions).where(eq(schema.bankTransactions.id, txId)).get();
  if (!tx || tx.matchStatus !== "UNMATCHED") return false;

  const lo = dayOffset(tx.transactionDate, -2);
  const hi = dayOffset(tx.transactionDate, 2);

  const candidates = db.select().from(schema.expenses)
    .where(and(
      eq(schema.expenses.amount, tx.amount),
      sql`${schema.expenses.occurredOn} BETWEEN ${lo} AND ${hi}`,
      isNull(schema.expenses.bankTransactionId),
    ))
    .all();

  let best: typeof candidates[number] | undefined;
  for (const c of candidates) {
    if (tx.cardLastFour && c.cardId) {
      const card = db.select().from(schema.cards).where(eq(schema.cards.id, c.cardId)).get();
      if (card?.lastFour && card.lastFour === tx.cardLastFour) { best = c; break; }
    } else if (!best) {
      best = c;
    }
  }

  if (!best) return false;

  db.update(schema.bankTransactions).set({
    matchedExpenseId: best.id,
    matchStatus: "AUTO_MATCHED",
  }).where(eq(schema.bankTransactions.id, tx.id)).run();

  db.update(schema.expenses).set({
    bankTransactionId: tx.id,
    isReconciled: true,
  }).where(eq(schema.expenses.id, best.id)).run();

  return true;
}

function dayOffset(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
