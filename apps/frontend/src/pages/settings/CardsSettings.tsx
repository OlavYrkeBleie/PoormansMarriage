import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Card, User } from "../../lib/types";

export function CardsSettings() {
  const [cards, setCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ label: "", lastFour: "", ownerUserId: "", isShared: true });

  async function load() {
    setCards(await api.get<Card[]>("/api/cards"));
    setUsers(await api.get<User[]>("/api/users"));
  }
  useEffect(() => { load(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    await api.post("/api/cards", {
      label: form.label,
      lastFour: form.lastFour || null,
      ownerUserId: form.ownerUserId ? Number(form.ownerUserId) : null,
      isShared: form.isShared,
    });
    setForm({ label: "", lastFour: "", ownerUserId: "", isShared: true });
    await load();
  }
  async function remove(id: number) {
    if (!confirm("Remove this card?")) return;
    await api.del(`/api/cards/${id}`);
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="panel-header">Add a card</div>
        <form className="card-body grid md:grid-cols-5 gap-3 items-end" onSubmit={add}>
          <div className="md:col-span-2">
            <label className="label">Label</label>
            <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required placeholder="Joint Sparebank1 Visa" />
          </div>
          <div>
            <label className="label">Last 4</label>
            <input className="input" value={form.lastFour} onChange={(e) => setForm({ ...form, lastFour: e.target.value })} maxLength={4} placeholder="1234" />
          </div>
          <div>
            <label className="label">Owner</label>
            <select className="input" value={form.ownerUserId} onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}>
              <option value="">Shared</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isShared} onChange={(e) => setForm({ ...form, isShared: e.target.checked })} />
            50/50 default
          </label>
          <div className="md:col-span-5">
            <button className="btn-primary">Add card</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="panel-header">Registered cards</div>
        <div className="data-head">
          <div className="w-8">#</div>
          <div>Card</div>
          <div>Owner</div>
          <div>Actions</div>
        </div>
        {cards.length === 0 && <div className="p-4 text-sm text-muted">No cards registered yet.</div>}
        {cards.map((c, i) => (
          <div key={c.id} className="data-row">
            <div className="w-8 text-xxs text-muted tabular">{i + 1}</div>
            <div>
              <div className="font-medium">{c.label}</div>
              <div className="text-xxs text-muted">
                {c.lastFour ? `****${c.lastFour}` : "no last-4"} - {c.isShared ? "50/50" : "personal"}
              </div>
            </div>
            <div className="text-xs">
              {c.ownerUserId ? users.find((u) => u.id === c.ownerUserId)?.displayName ?? "?" : "shared"}
            </div>
            <button className="btn-danger text-xxs" onClick={() => remove(c.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
