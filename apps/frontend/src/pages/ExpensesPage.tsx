import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../lib/api";
import type { Category, Expense, User } from "../lib/types";

export function ExpensesPage() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [catFilter, setCatFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    api.get<Category[]>("/api/categories").then(setCats).catch(() => {});
    api.get<User[]>("/api/users").then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (catFilter) params.set("categoryId", catFilter);
    if (userFilter) params.set("userId", userFilter);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    api.get<Expense[]>(`/api/expenses?${params}`).then(setRows).catch(() => {});
  }, [catFilter, userFilter, from, to]);

  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const userName = new Map(users.map((u) => [u.id, u.displayName]));
  const total = rows.reduce((s, r) => s + (r.excluded ? 0 : r.amount), 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <h1 className="section-title">Expenses <span className="text-xxs text-muted font-normal">({rows.length})</span></h1>
        <Link to="/expenses/new" className="btn-primary">Add expense</Link>
      </div>

      <div className="card">
        <div className="panel-header">Filters</div>
        <div className="card-body grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">All</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Paid by</label>
            <select className="input" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
              <option value="">Anyone</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <div className="stat-label">Total</div>
            <div className="text-base font-semibold tabular">{formatMoney(total)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="data-head">
          <div className="w-20">Date</div>
          <div>Merchant / category</div>
          <div>Amount</div>
          <div>Source</div>
        </div>
        {rows.length === 0 && <div className="p-4 text-sm text-muted">No expenses match.</div>}
        {rows.map((e) => (
          <Link key={e.id} to={`/expenses/${e.id}`} className="data-row">
            <div className="w-20 text-xxs text-muted tabular">{e.occurredOn}</div>
            <div>
              <div className="font-medium truncate">{e.merchantName ?? "(no merchant)"}</div>
              <div className="text-xxs text-muted">
                {e.categoryId ? catName.get(e.categoryId) ?? "Uncategorized" : "Uncategorized"}
                {e.paidByUserId ? ` - paid by ${userName.get(e.paidByUserId) ?? "?"}` : ""}
                {e.isReconciled ? " - reconciled" : ""}
                {e.excluded ? " - excluded" : ""}
              </div>
            </div>
            <div className="font-medium tabular" style={{ textDecoration: e.excluded ? "line-through" : "none" }}>{formatMoney(e.amount, e.currency)}</div>
            <div className="text-xxs text-muted">{e.source.toLowerCase().replace("_", " ")}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
