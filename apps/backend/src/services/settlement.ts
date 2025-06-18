import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export interface SettlementProposal {
  periodStart: string;
  periodEnd: string;
  breakdown: Array<{ userId: number; displayName: string; paid: number; owed: number; net: number }>;
  fromUserId: number | null;
  toUserId: number | null;
  amount: number;
}

export function computeSettlement(periodStart: string, periodEnd: string): SettlementProposal {
  const users = db.select().from(schema.users).all();
  const rows = db.select().from(schema.expenses).where(and(
    eq(schema.expenses.excluded, false),
    gte(schema.expenses.occurredOn, periodStart),
    lte(schema.expenses.occurredOn, periodEnd),
  )).all();

  const paid: Record<number, number> = {};
  const owed: Record<number, number> = {};
  for (const u of users) { paid[u.id] = 0; owed[u.id] = 0; }

  for (const e of rows) {
    if (e.paidByUserId != null) paid[e.paidByUserId] = (paid[e.paidByUserId] ?? 0) + e.amount;
    for (const [uid, pct] of Object.entries(e.split)) {
      const k = Number(uid);
      owed[k] = (owed[k] ?? 0) + Math.round(e.amount * (pct / 100));
    }
  }

  const breakdown = users.map((u) => ({
    userId: u.id,
    displayName: u.displayName,
    paid: paid[u.id] ?? 0,
    owed: owed[u.id] ?? 0,
    net: (paid[u.id] ?? 0) - (owed[u.id] ?? 0),
  }));

  const sorted = [...breakdown].sort((a, b) => a.net - b.net);
  const from = sorted[0];
  const to = sorted[sorted.length - 1];

  if (!from || !to || from.net >= 0) {
    return { periodStart, periodEnd, breakdown, fromUserId: null, toUserId: null, amount: 0 };
  }

  return {
    periodStart,
    periodEnd,
    breakdown,
    fromUserId: from.userId,
    toUserId: to.userId,
    amount: Math.min(-from.net, to.net),
  };
}
