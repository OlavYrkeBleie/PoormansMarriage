import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Category, Merchant } from "../../lib/types";

export function MerchantsSettings() {
  const [rows, setRows] = useState<Merchant[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({ namePattern: "", defaultCategoryId: "" });

  async function load() {
    setRows(await api.get<Merchant[]>("/api/merchants"));
    setCats(await api.get<Category[]>("/api/categories"));
  }
  useEffect(() => { load(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    await api.post("/api/merchants", {
      namePattern: form.namePattern,
      defaultCategoryId: form.defaultCategoryId ? Number(form.defaultCategoryId) : null,
    });
    setForm({ namePattern: "", defaultCategoryId: "" });
    await load();
  }
  async function remove(id: number) {
    if (!confirm("Remove this rule?")) return;
    await api.del(`/api/merchants/${id}`);
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="panel-header">Add a rule</div>
        <form className="card-body grid md:grid-cols-3 gap-3 items-end" onSubmit={add}>
          <div className="md:col-span-2">
            <label className="label">Merchant pattern</label>
            <input className="input" value={form.namePattern} onChange={(e) => setForm({ ...form, namePattern: e.target.value })} placeholder="HAUGALAND KRAFT" required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.defaultCategoryId} onChange={(e) => setForm({ ...form, defaultCategoryId: e.target.value })}>
              <option value="">(none)</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-3"><button className="btn-primary">Add rule</button></div>
        </form>
      </div>

      <div className="card">
        <div className="panel-header">Learned rules</div>
        <div className="data-head">
          <div className="w-8">#</div>
          <div>Pattern</div>
          <div>Category</div>
          <div>Actions</div>
        </div>
        {rows.length === 0 && <div className="p-4 text-sm text-muted">No rules yet. They get created automatically when you categorize an expense.</div>}
        {rows.map((r, i) => (
          <div key={r.id} className="data-row">
            <div className="w-8 text-xxs text-muted tabular">{i + 1}</div>
            <div className="font-medium truncate">{r.namePattern}</div>
            <div className="text-xs">{cats.find((c) => c.id === r.defaultCategoryId)?.name ?? "-"}</div>
            <button className="btn-danger text-xxs" onClick={() => remove(r.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
