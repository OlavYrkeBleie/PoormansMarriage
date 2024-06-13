import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, formatMoney } from "../lib/api";
import type { Card, Category, Expense, User } from "../lib/types";

export function ExpenseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = id != null;

  const [cats, setCats] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [amountStr, setAmountStr] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [cardId, setCardId] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitUser, setSplitUser] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Category[]>("/api/categories"),
      api.get<Card[]>("/api/cards"),
      api.get<User[]>("/api/users"),
    ]).then(([c, k, u]) => {
      setCats(c); setCards(k); setUsers(u);
      if (u.length === 2) setSplitUser({ [u[0]!.id]: 50, [u[1]!.id]: 50 });
    });
  }, []);

  useEffect(() => {
    if (!editing) return;
    api.get<Expense>(`/api/expenses/${id}`).then((e) => {
      setOccurredOn(e.occurredOn);
      setAmountStr((e.amount / 100).toFixed(2));
      setMerchant(e.merchantName ?? "");
      setCategoryId(e.categoryId?.toString() ?? "");
      setCardId(e.cardId?.toString() ?? "");
      setPaidBy(e.paidByUserId?.toString() ?? "");
      setSplitUser(e.split);
      setNotes(e.notes ?? "");
    }).catch(() => {});
  }, [id, editing]);

  function pickCard(cid: string) {
    setCardId(cid);
    const card = cards.find((c) => c.id === Number(cid));
    if (card?.ownerUserId) setPaidBy(String(card.ownerUserId));
    if (card?.isShared && users.length === 2) setSplitUser({ [users[0]!.id]: 50, [users[1]!.id]: 50 });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amount = Math.round(parseFloat(amountStr.replace(",", ".")) * 100);
    const body = {
      occurredOn,
      amount,
      currency: "NOK",
      merchantName: merchant || null,
      categoryId: categoryId ? Number(categoryId) : null,
      cardId: cardId ? Number(cardId) : null,
      paidByUserId: paidBy ? Number(paidBy) : null,
      split: splitUser,
      notes: notes || null,
      source: "MANUAL" as const,
    };
    if (editing) await api.patch(`/api/expenses/${id}`, body);
    else await api.post("/api/expenses", body);
    navigate("/expenses");
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this expense?")) return;
    await api.del(`/api/expenses/${id}`);
    navigate("/expenses");
  }

  const splitSum = Object.values(splitUser).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">{editing ? "Edit expense" : "New expense"}</h1>
      <form className="card card-body space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} required />
          </div>
          <div>
            <label className="label">Amount (NOK)</label>
            <input inputMode="decimal" className="input" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} required placeholder="0,00" />
          </div>
        </div>
        <div>
          <label className="label">Merchant</label>
          <input className="input" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="REMA 1000" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">(none)</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Card</label>
            <select className="input" value={cardId} onChange={(e) => pickCard(e.target.value)}>
              <option value="">(none)</option>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.label}{c.lastFour ? ` (${c.lastFour})` : ""}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Paid by</label>
          <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Split</label>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-32 text-sm">{u.displayName}</div>
                <input type="number" min={0} max={100} className="input flex-1"
                       value={splitUser[u.id] ?? 0}
                       onChange={(ev) => setSplitUser({ ...splitUser, [u.id]: Number(ev.target.value) })} />
                <div className="text-sm text-muted w-8">%</div>
              </div>
            ))}
            <div className="text-xs" style={{ color: Math.abs(splitSum - 100) < 0.01 ? "rgb(var(--muted))" : "rgb(var(--danger))" }}>
              Sum: {splitSum}% {splitSum !== 100 && "(must equal 100)"}
            </div>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {amountStr && (
          <div className="text-xs text-muted">Preview: {formatMoney(Math.round(parseFloat(amountStr.replace(",", ".")) * 100 || 0))}</div>
        )}

        <div className="flex justify-between gap-2">
          {editing ? <button type="button" className="btn-danger" onClick={remove}>Delete</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? "Save" : "Add"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
