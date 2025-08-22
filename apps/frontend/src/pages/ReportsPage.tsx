import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, formatMoney } from "../lib/api";
import type { SettlementProposal } from "../lib/types";

interface Summary {
  total: number;
  count: number;
  byCategory: Array<{ name: string; amount: number }>;
  byMonth: Array<{ month: string; amount: number }>;
}

const COLORS = ["#2a5fa6", "#2b7a3e", "#c47a00", "#b53a3a", "#6c43a6", "#148a7a", "#c55a14", "#4a5366"];

function firstOfMonth(d = new Date()): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10);
}
function lastOfMonth(d = new Date()): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)).toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(lastOfMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [proposal, setProposal] = useState<SettlementProposal | null>(null);

  useEffect(() => {
    api.get<Summary>(`/api/reports/summary?from=${from}&to=${to}`).then(setSummary).catch(() => {});
    api.post<SettlementProposal>("/api/settlements/preview", { periodStart: from, periodEnd: to }).then(setProposal).catch(() => {});
  }, [from, to]);

  async function settle() {
    if (!proposal || !proposal.fromUserId || !proposal.toUserId || !proposal.amount) return;
    if (!confirm(`Record a settlement of ${formatMoney(proposal.amount)}?`)) return;
    await api.post("/api/settlements", { periodStart: from, periodEnd: to });
    const fresh = await api.post<SettlementProposal>("/api/settlements/preview", { periodStart: from, periodEnd: to });
    setProposal(fresh);
    alert("Settlement recorded. Mark it as paid once the transfer clears.");
  }

  function downloadCsv() {
    window.location.href = `/api/export/csv?from=${from}&to=${to}`;
  }
  function downloadPdf() {
    const month = from.slice(0, 7);
    window.location.href = `/api/export/pdf?month=${month}`;
  }

  return (
    <div className="space-y-3">
      <h1 className="section-title">Reports</h1>

      <div className="card">
        <div className="panel-header">Period &amp; export</div>
        <div className="card-body flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input w-36" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn-ghost" onClick={downloadCsv}>Export CSV</button>
          <button className="btn-ghost" onClick={downloadPdf}>Export PDF (month)</button>
        </div>
      </div>

      {summary && (
        <div className="grid md:grid-cols-3 gap-3">
          <div className="card card-body">
            <div className="stat-label">Total</div>
            <div className="stat-value">{formatMoney(summary.total)}</div>
            <div className="text-xxs text-muted mt-1">{summary.count} expenses</div>
          </div>
          <div className="card card-body md:col-span-2">
            <div className="stat-label">Settle-up suggestion</div>
            {!proposal?.fromUserId ? (
              <div className="text-sm mt-1">All square for this period.</div>
            ) : (
              <div>
                <div className="text-lg font-semibold mt-1">
                  {proposal.breakdown.find((b) => b.userId === proposal.fromUserId)?.displayName}
                  {" owes "}
                  {proposal.breakdown.find((b) => b.userId === proposal.toUserId)?.displayName}
                  {" "}
                  <span className="tabular">{formatMoney(proposal.amount)}</span>
                </div>
                <button className="btn-primary mt-3" onClick={settle}>Record settlement</button>
              </div>
            )}
          </div>
        </div>
      )}

      {summary && summary.byCategory.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          <div className="card">
            <div className="panel-header">By category</div>
            <div className="p-3" style={{ height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={summary.byCategory} dataKey="amount" nameKey="name" outerRadius={90} label={(d: { name?: string }) => d.name ?? ""}>
                    {summary.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="panel-header">By month</div>
            <div className="p-3" style={{ height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={summary.byMonth}>
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis tickFormatter={(v) => (v / 100).toFixed(0)} fontSize={11} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="amount" fill={COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
