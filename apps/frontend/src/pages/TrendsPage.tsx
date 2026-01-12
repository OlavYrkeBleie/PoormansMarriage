import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api, formatMoney } from "../lib/api";
import type { Category, Checkpoint, PaybackResult, TrendSeries } from "../lib/types";

type View = "cumulative" | "monthly";

export function TrendsPage() {
  const [trend, setTrend] = useState<TrendSeries | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [view, setView] = useState<View>("cumulative");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [paybacks, setPaybacks] = useState<Record<number, PaybackResult>>({});

  async function loadAll() {
    const params = new URLSearchParams();
    if (categoryFilter) params.set("categoryId", categoryFilter);
    const [t, c, k] = await Promise.all([
      api.get<TrendSeries>(`/api/trends?${params}`),
      api.get<Checkpoint[]>("/api/checkpoints"),
      api.get<Category[]>("/api/categories"),
    ]);
    setTrend(t); setCheckpoints(c); setCats(k);

    const filteredCheckpoints = categoryFilter
      ? c.filter((x) => x.categoryId === Number(categoryFilter))
      : c;
    const paybackResults = await Promise.all(
      filteredCheckpoints.map((cp) => api.get<PaybackResult>(`/api/checkpoints/${cp.id}/payback`).catch(() => null))
    );
    const pb: Record<number, PaybackResult> = {};
    paybackResults.forEach((r) => { if (r) pb[r.checkpointId] = r; });
    setPaybacks(pb);
  }
  useEffect(() => { loadAll(); }, [categoryFilter]);

  const chartData = useMemo(() => {
    if (!trend) return [];
    if (view === "cumulative") {
      return trend.daily.map((d) => ({ x: d.date, y: d.cumulative }));
    }
    return trend.monthly.map((m) => ({ x: m.month, y: m.total }));
  }, [trend, view]);

  const visibleCheckpoints = useMemo(() => {
    if (!trend || !trend.firstDate || !trend.lastDate) return [];
    const filtered = categoryFilter
      ? checkpoints.filter((c) => c.categoryId === Number(categoryFilter))
      : checkpoints;
    return filtered.filter((c) => c.occurredOn >= trend.firstDate! && c.occurredOn <= trend.lastDate!);
  }, [checkpoints, trend, categoryFilter]);

  function checkpointCumulativeY(cp: Checkpoint): number | null {
    if (!trend) return null;
    const point = trend.daily.find((d) => d.date >= cp.occurredOn);
    return point ? point.cumulative : null;
  }

  return (
    <div className="space-y-3">
      <h1 className="section-title">Trends &amp; Forecast</h1>

      <div className="card">
        <div className="panel-header">View</div>
        <div className="card-body flex flex-wrap items-end gap-3">
          <div className="flex gap-0">
            <button className={`tab ${view === "cumulative" ? "active" : ""}`} onClick={() => setView("cumulative")}>Cumulative</button>
            <button className={`tab ${view === "monthly" ? "active" : ""}`} onClick={() => setView("monthly")}>Monthly</button>
          </div>
          <div>
            <label className="label">Category filter</label>
            <select className="input w-48" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {trend && (
            <div className="ml-auto text-right">
              <div className="stat-label">Total</div>
              <div className="text-lg font-semibold tabular">{formatMoney(trend.totalAmount)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="panel-header">{view === "cumulative" ? "Cumulative spend" : "Monthly spend"}</div>
        <div className="p-2" style={{ height: 380 }}>
          {chartData.length === 0 && <div className="h-full grid place-items-center text-sm text-muted">No data yet.</div>}
          {chartData.length > 0 && (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 40 }}>
                <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="2 4" />
                <XAxis dataKey="x" fontSize={11} tick={{ fill: "rgb(var(--muted))" }} />
                <YAxis tickFormatter={(v) => (v / 100).toFixed(0)} fontSize={11} tick={{ fill: "rgb(var(--muted))" }} width={60} />
                <Tooltip
                  formatter={(v: number) => [formatMoney(v), view === "cumulative" ? "Cumulative" : "Month total"]}
                  contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="y" stroke="#2a5fa6" strokeWidth={1.5} dot={false} />
                {view === "cumulative" && visibleCheckpoints.map((cp) => {
                  const y = checkpointCumulativeY(cp);
                  if (y == null) return null;
                  return (
                    <ReferenceDot key={cp.id} x={cp.occurredOn} y={y} r={5} fill="#c47a00" stroke="#603a00" ifOverflow="visible" />
                  );
                })}
                {view === "monthly" && visibleCheckpoints.map((cp) => (
                  <ReferenceLine key={cp.id} x={cp.occurredOn.slice(0, 7)} stroke="#c47a00" strokeDasharray="3 3" ifOverflow="visible" />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <CheckpointsEditor cats={cats} checkpoints={checkpoints} paybacks={paybacks} onChange={loadAll} />
    </div>
  );
}

function CheckpointsEditor({
  cats, checkpoints, paybacks, onChange,
}: {
  cats: Category[];
  checkpoints: Checkpoint[];
  paybacks: Record<number, PaybackResult>;
  onChange: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    occurredOn: new Date().toISOString().slice(0, 10),
    label: "",
    amount: "",
    categoryId: "",
    notes: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  function reset() {
    setForm({
      occurredOn: new Date().toISOString().slice(0, 10),
      label: "", amount: "", categoryId: "", notes: "",
    });
    setEditingId(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const amount = Math.round(parseFloat(form.amount.replace(",", ".")) * 100);
    const body = {
      occurredOn: form.occurredOn,
      label: form.label,
      amount,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      notes: form.notes || null,
    };
    if (editingId != null) {
      await api.patch(`/api/checkpoints/${editingId}`, body);
    } else {
      await api.post("/api/checkpoints", body);
    }
    reset();
    await onChange();
  }

  async function remove(id: number) {
    if (!confirm("Remove this checkpoint?")) return;
    await api.del(`/api/checkpoints/${id}`);
    if (editingId === id) reset();
    await onChange();
  }

  function startEdit(c: Checkpoint) {
    setEditingId(c.id);
    setForm({
      occurredOn: c.occurredOn,
      label: c.label,
      amount: (c.amount / 100).toFixed(2),
      categoryId: c.categoryId?.toString() ?? "",
      notes: c.notes ?? "",
    });
  }

  return (
    <div className="grid md:grid-cols-5 gap-3">
      <div className="card md:col-span-2">
        <div className="panel-header">{editingId == null ? "Add a checkpoint" : "Edit checkpoint"}</div>
        <form className="card-body space-y-3" onSubmit={save}>
          <div>
            <label className="label">Label</label>
            <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required placeholder="Installed heat pump" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} required />
            </div>
            <div>
              <label className="label">One-time cost (NOK)</label>
              <input inputMode="decimal" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="10000,00" />
            </div>
          </div>
          <div>
            <label className="label">Category (for payback)</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">All categories</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="text-xxs text-muted mt-0.5">Picking a category isolates the savings calc to that spend bucket (e.g. Power &amp; Electricity for a heat pump).</div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary">{editingId == null ? "Add checkpoint" : "Save"}</button>
            {editingId != null && <button type="button" className="btn-ghost" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card md:col-span-3">
        <div className="panel-header">Checkpoints &amp; payback</div>
        {checkpoints.length === 0 && <div className="p-4 text-sm text-muted">No checkpoints yet. Log significant one-time costs (e.g. a heat pump) and the app will estimate how long until the monthly savings pay it back.</div>}
        {checkpoints.map((c) => {
          const pb = paybacks[c.id];
          const catName = c.categoryId ? cats.find((x) => x.id === c.categoryId)?.name : "All categories";
          return (
            <div key={c.id} className="border-b border-border p-3">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xxs text-muted tabular">
                    {c.occurredOn} - {formatMoney(c.amount)} - {catName}
                  </div>
                  {c.notes && <div className="text-xs text-muted mt-1">{c.notes}</div>}
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost text-xxs" onClick={() => startEdit(c)}>Edit</button>
                  <button className="btn-danger text-xxs" onClick={() => remove(c.id)}>Remove</button>
                </div>
              </div>

              {pb && (
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <PbStat label="Pre avg/month" value={pb.preSlopePerMonth != null ? formatMoney(pb.preSlopePerMonth) : "-"} />
                  <PbStat label="Post avg/month" value={pb.postSlopePerMonth != null ? formatMoney(pb.postSlopePerMonth) : "-"} />
                  <PbStat label="Saving/month" value={pb.savingsPerMonth != null ? formatMoney(pb.savingsPerMonth) : "-"} />
                  <PbStat label="Payback" value={pb.paybackMonths != null ? `${pb.paybackMonths.toFixed(1)} mo (~${pb.paybackDate})` : "-"} />
                  {pb.note && <div className="col-span-full text-xxs text-muted italic">{pb.note}</div>}
                  <div className="col-span-full text-xxs text-muted">
                    Based on {pb.sampleMonthsPre} month(s) before, {pb.sampleMonthsPost} after.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PbStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xxs text-muted uppercase tracking-wider">{label}</div>
      <div className="font-medium tabular">{value}</div>
    </div>
  );
}
