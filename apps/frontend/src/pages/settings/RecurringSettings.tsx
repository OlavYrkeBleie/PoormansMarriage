import { FormEvent, useEffect, useState } from "react";
import { api, formatMoney } from "../../lib/api";
import type { Category, RecurringBill } from "../../lib/types";

export function RecurringSettings() {
  const [rows, setRows] = useState<RecurringBill[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "", categoryId: "", expectedAmount: "", cadence: "MONTHLY", nextExpectedDate: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    setRows(await api.get<RecurringBill[]>("/api/recurring-bills"));
    setCats(await api.get<Category[]>("/api/categories"));
  }
  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ name: "", categoryId: "", expectedAmount: "", cadence: "MONTHLY", nextExpectedDate: "" });
    setEditingId(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const amount = form.expectedAmount ? Math.round(parseFloat(form.expectedAmount.replace(",", ".")) * 100) : null;
    const body = {
      name: form.name,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      expectedAmount: amount,
      cadence: form.cadence as "MONTHLY" | "QUARTERLY" | "ANNUAL",
      nextExpectedDate: form.nextExpectedDate || null,
    };
    if (editingId != null) {
      await api.patch(`/api/recurring-bills/${editingId}`, body);
    } else {
      await api.post("/api/recurring-bills", body);
    }
    resetForm();
    await load();
  }

  async function toggle(b: RecurringBill) {
    await api.patch(`/api/recurring-bills/${b.id}`, { active: !b.active });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Remove this recurring bill?")) return;
    await api.del(`/api/recurring-bills/${id}`);
    if (editingId === id) resetForm();
    await load();
  }

  function startEdit(b: RecurringBill) {
    setEditingId(b.id);
    setForm({
      name: b.name,
      categoryId: b.categoryId?.toString() ?? "",
      expectedAmount: b.expectedAmount != null ? (b.expectedAmount / 100).toFixed(2) : "",
      cadence: b.cadence,
      nextExpectedDate: b.nextExpectedDate ?? "",
    });
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="panel-header">{editingId == null ? "Add a recurring bill" : "Edit recurring bill"}</div>
        <form className="card-body grid md:grid-cols-5 gap-3 items-end" onSubmit={save}>
          <div className="md:col-span-2">
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Haugaland Kraft" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">(none)</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Expected amount</label>
            <input className="input" value={form.expectedAmount} onChange={(e) => setForm({ ...form, expectedAmount: e.target.value })} placeholder="1200,00" />
            <div className="text-xxs text-muted mt-0.5">Used only as a sanity-check. Actual amount comes from the invoice.</div>
          </div>
          <div>
            <label className="label">Cadence</label>
            <select className="input" value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })}>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Next expected date</label>
            <input type="date" className="input" value={form.nextExpectedDate} onChange={(e) => setForm({ ...form, nextExpectedDate: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button className="btn-primary">{editingId == null ? "Add bill" : "Save changes"}</button>
            {editingId != null && <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="panel-header">Recurring bills</div>
        <div className="data-head">
          <div className="w-8">#</div>
          <div>Bill</div>
          <div>Amount</div>
          <div>Actions</div>
        </div>
        {rows.length === 0 && <div className="p-4 text-sm text-muted">No recurring bills yet.</div>}
        {rows.map((b, i) => (
          <div key={b.id} className="data-row" style={{ opacity: b.active ? 1 : 0.5 }}>
            <div className="w-8 text-xxs text-muted tabular">{i + 1}</div>
            <div>
              <div className="font-medium">{b.name}</div>
              <div className="text-xxs text-muted">
                {b.cadence.toLowerCase()}
                {b.nextExpectedDate ? ` - next ${b.nextExpectedDate}` : ""}
                {b.active ? "" : " - paused"}
              </div>
            </div>
            <div className="tabular">{b.expectedAmount != null ? `~${formatMoney(b.expectedAmount)}` : "-"}</div>
            <div className="flex gap-1">
              <button className="btn-ghost text-xxs" onClick={() => startEdit(b)}>Edit</button>
              <button className="btn-ghost text-xxs" onClick={() => toggle(b)}>{b.active ? "Pause" : "Activate"}</button>
              <button className="btn-danger text-xxs" onClick={() => remove(b.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
