import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../lib/api";
import type { Balance, Expense, RecurringBill } from "../lib/types";

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate + "T00:00:00Z").getTime();
  const now = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  return Math.round((target - now) / 86400000);
}

export function DashboardPage() {
  const [balance, setBalance] = useState<Balance[]>([]);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [bills, setBills] = useState<RecurringBill[]>([]);

  async function load() {
    const [b, e, r] = await Promise.all([
      api.get<Balance[]>("/api/expenses/balance"),
      api.get<Expense[]>("/api/expenses?limit=6"),
      api.get<RecurringBill[]>("/api/recurring-bills"),
    ]);
    setBalance(b); setRecent(e); setBills(r);
  }
  useEffect(() => { load(); }, []);

  const settleLine = (() => {
    if (balance.length < 2) return null;
    const sorted = [...balance].sort((a, b) => a.net - b.net);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    if (!low || !high || low.net >= 0 || high.net <= 0) return null;
    const amount = Math.min(-low.net, high.net);
    return { from: low.displayName, to: high.displayName, amount };
  })();

  const upcoming = bills
    .filter((b) => b.active && b.nextExpectedDate)
    .map((b) => ({ bill: b, days: daysUntil(b.nextExpectedDate!) }))
    .filter((x) => x.days >= 0 && x.days <= 60)
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <h1 className="section-title">Dashboard</h1>
        <Link to="/expenses/new" className="btn-primary">Add expense</Link>
      </div>

      <div className="card">
        <div className="panel-header">Balance</div>
        <div className="card-body">
          <div className="stat-value">
            {settleLine
              ? <>{settleLine.from} owes {settleLine.to} <span className="tabular">{formatMoney(settleLine.amount)}</span></>
              : "All square"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-px" style={{ background: "rgb(var(--border))" }}>
            {balance.map((b) => (
              <div key={b.userId} className="p-3" style={{ background: "rgb(var(--surface))" }}>
                <div className="stat-label">{b.displayName}</div>
                <div className="text-xl font-semibold tabular" style={{ color: b.net > 0 ? "rgb(var(--ok))" : b.net < 0 ? "rgb(var(--danger))" : "inherit" }}>
                  {b.net > 0 ? "+" : ""}{formatMoney(b.net)}
                </div>
                <div className="text-xxs text-muted mt-1 tabular">Paid {formatMoney(b.paid)} &middot; Share {formatMoney(b.owed)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="card">
          <div className="panel-header">
            <span>Recent</span>
            <Link to="/expenses" className="text-xxs">See all</Link>
          </div>
          {recent.length === 0 && <div className="p-4 text-sm text-muted">No expenses yet.</div>}
          {recent.map((e) => (
            <Link key={e.id} to={`/expenses/${e.id}`} className="data-row">
              <div className="text-xxs text-muted tabular w-20">{e.occurredOn}</div>
              <div>
                <div className="font-medium truncate">{e.merchantName ?? "(no merchant)"}</div>
                <div className="text-xxs text-muted">{e.source.toLowerCase().replace("_", " ")}</div>
              </div>
              <div className="font-medium tabular">{formatMoney(e.amount, e.currency)}</div>
              <div />
            </Link>
          ))}
        </div>

        <div className="card">
          <div className="panel-header">
            <span>Upcoming bills (next 60 days)</span>
            <Link to="/settings/recurring" className="text-xxs">Manage</Link>
          </div>
          {upcoming.length === 0 && <div className="p-4 text-sm text-muted">Nothing scheduled in the next 60 days.</div>}
          {upcoming.map(({ bill, days }) => (
            <div key={bill.id} className="data-row">
              <div className="text-xxs text-muted tabular w-20">{bill.nextExpectedDate}</div>
              <div>
                <div className="font-medium">{bill.name}</div>
                <div className="text-xxs text-muted">
                  {bill.cadence.toLowerCase()}
                  {days === 0 ? " - due today" : days === 1 ? " - due tomorrow" : ` - in ${days} days`}
                </div>
              </div>
              <div className="font-medium tabular">{bill.expectedAmount != null ? formatMoney(bill.expectedAmount) : "~"}</div>
              <div />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
