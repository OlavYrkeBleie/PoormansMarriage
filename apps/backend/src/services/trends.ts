import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export interface TrendPoint {
  date: string;
  daily: number;
  cumulative: number;
}

export interface MonthlyPoint {
  month: string;
  total: number;
}

export interface TrendSeries {
  daily: TrendPoint[];
  monthly: MonthlyPoint[];
  firstDate: string | null;
  lastDate: string | null;
  totalAmount: number;
}

export interface PaybackResult {
  checkpointId: number;
  label: string;
  occurredOn: string;
  amount: number;
  categoryId: number | null;
  preSlopePerMonth: number | null;
  postSlopePerMonth: number | null;
  savingsPerMonth: number | null;
  paybackMonths: number | null;
  paybackDate: string | null;
  sampleMonthsPre: number;
  sampleMonthsPost: number;
  note: string | null;
}

export function buildTrend(opts: {
  from?: string;
  to?: string;
  categoryId?: number;
}): TrendSeries {
  const conds = [eq(schema.expenses.excluded, false)];
  if (opts.from) conds.push(gte(schema.expenses.occurredOn, opts.from));
  if (opts.to) conds.push(lte(schema.expenses.occurredOn, opts.to));
  if (opts.categoryId) conds.push(eq(schema.expenses.categoryId, opts.categoryId));

  const rows = db.select({
    occurredOn: schema.expenses.occurredOn,
    amount: schema.expenses.amount,
  }).from(schema.expenses).where(and(...conds)).all();

  const byDay = new Map<string, number>();
  for (const r of rows) {
    byDay.set(r.occurredOn, (byDay.get(r.occurredOn) ?? 0) + r.amount);
  }

  const sortedDays = [...byDay.keys()].sort();
  const daily: TrendPoint[] = [];
  let cum = 0;
  for (const day of sortedDays) {
    const d = byDay.get(day) ?? 0;
    cum += d;
    daily.push({ date: day, daily: d, cumulative: cum });
  }

  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const m = r.occurredOn.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + r.amount);
  }
  const monthly: MonthlyPoint[] = [...byMonth.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    daily,
    monthly,
    firstDate: sortedDays[0] ?? null,
    lastDate: sortedDays[sortedDays.length - 1] ?? null,
    totalAmount: cum,
  };
}

function monthsBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + "T00:00:00Z");
  const b = new Date(isoB + "T00:00:00Z");
  const years = b.getUTCFullYear() - a.getUTCFullYear();
  const months = b.getUTCMonth() - a.getUTCMonth();
  const days = (b.getTime() - a.getTime()) / 86400000;
  return years * 12 + months + (b.getUTCDate() - a.getUTCDate()) / 30.44 + Math.max(0, days) * 0;
}

function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00Z");
  const whole = Math.floor(months);
  const frac = months - whole;
  d.setUTCMonth(d.getUTCMonth() + whole);
  d.setUTCDate(d.getUTCDate() + Math.round(frac * 30.44));
  return d.toISOString().slice(0, 10);
}

function linearSlopePerMonth(monthly: MonthlyPoint[]): number | null {
  if (monthly.length < 2) return null;
  const xs = monthly.map((_, i) => i);
  const ys = monthly.map((m) => m.total);
  const n = xs.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i]!, 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  return (n * sxy - sx * sy) / denom; // slope in (amount per month-step)
}

export function computePayback(checkpointId: number): PaybackResult | null {
  const cp = db.select().from(schema.checkpoints).where(eq(schema.checkpoints.id, checkpointId)).get();
  if (!cp) return null;

  const makeSeries = (from: string | null, to: string | null) => {
    const conds = [eq(schema.expenses.excluded, false)];
    if (cp.categoryId) conds.push(eq(schema.expenses.categoryId, cp.categoryId));
    if (from) conds.push(gte(schema.expenses.occurredOn, from));
    if (to) conds.push(lte(schema.expenses.occurredOn, to));
    const rows = db.select({
      occurredOn: schema.expenses.occurredOn,
      amount: schema.expenses.amount,
    }).from(schema.expenses).where(and(...conds)).all();
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      const m = r.occurredOn.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + r.amount);
    }
    return [...byMonth.entries()]
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const dayBefore = addMonthsISO(cp.occurredOn, 0);
  const pre = makeSeries(null, dayBefore);
  const post = makeSeries(cp.occurredOn, null);

  // Use average monthly spend in pre vs post if regression too noisy.
  const preAvg = pre.length > 0 ? pre.reduce((a, b) => a + b.total, 0) / pre.length : null;
  const postAvg = post.length > 0 ? post.reduce((a, b) => a + b.total, 0) / post.length : null;

  let preSlope = preAvg;
  let postSlope = postAvg;

  if (pre.length >= 4) {
    const s = linearSlopePerMonth(pre.slice(-12));
    if (s != null) preSlope = (preAvg ?? 0) + s * 0; // average is more stable; slope used for trend viz elsewhere
  }

  const savingsPerMonth = preSlope != null && postSlope != null ? preSlope - postSlope : null;
  let paybackMonths: number | null = null;
  let paybackDate: string | null = null;
  let note: string | null = null;

  if (savingsPerMonth == null) {
    note = post.length === 0
      ? "Need at least one month of data after the checkpoint to estimate payback."
      : "Need data on both sides of the checkpoint.";
  } else if (savingsPerMonth <= 0) {
    note = "No monthly saving detected yet (spend is flat or higher post-checkpoint).";
  } else if (cp.amount <= 0) {
    note = "Checkpoint has no cost; nothing to pay back.";
  } else {
    paybackMonths = cp.amount / savingsPerMonth;
    paybackDate = addMonthsISO(cp.occurredOn, paybackMonths);
  }

  return {
    checkpointId: cp.id,
    label: cp.label,
    occurredOn: cp.occurredOn,
    amount: cp.amount,
    categoryId: cp.categoryId,
    preSlopePerMonth: preSlope,
    postSlopePerMonth: postSlope,
    savingsPerMonth,
    paybackMonths,
    paybackDate,
    sampleMonthsPre: pre.length,
    sampleMonthsPost: post.length,
    note,
  };
}
