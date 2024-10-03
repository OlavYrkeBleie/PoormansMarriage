import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatMoney } from "../lib/api";
import type { Card, Category, Receipt, User } from "../lib/types";

export function ReceiptUploadPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [polling, setPolling] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Category[]>("/api/categories").then(setCats).catch(() => {});
    api.get<Card[]>("/api/cards").then(setCards).catch(() => {});
    api.get<User[]>("/api/users").then(setUsers).catch(() => {});
  }, []);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    const fd = new FormData();
    fd.append("image", f);
    try {
      const r = await api.post<Receipt>("/api/receipts", fd);
      setReceipt(r);
      setPolling(true);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    }
  }

  useEffect(() => {
    if (!polling || !receipt) return;
    const iv = setInterval(async () => {
      try {
        const r = await api.get<Receipt>(`/api/receipts/${receipt.id}`);
        if (r.parsedTotal != null || r.parsedMerchant != null || r.ocrText != null) {
          setReceipt(r);
          setPolling(false);
          clearInterval(iv);
        }
      } catch {}
    }, 1200);
    return () => clearInterval(iv);
  }, [polling, receipt]);

  if (!receipt) {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-bg">
        <div className="card card-body w-full max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">Add a receipt</h1>
          <p className="text-sm text-muted">Capture or pick an image. OCR fills in the date, total, and merchant.</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePick} />
          <button className="btn-primary w-full py-4 text-base" onClick={() => fileRef.current?.click()}>
            Capture receipt
          </button>
          {error && <div className="text-sm" style={{ color: "rgb(var(--danger))" }}>{error}</div>}
          <Link to="/" className="text-xs text-muted block">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <ReceiptConfirm
      receipt={receipt}
      cats={cats}
      cards={cards}
      users={users}
      onCancel={() => { setReceipt(null); setPolling(false); }}
      onDone={() => navigate("/receipts")}
    />
  );
}

function ReceiptConfirm({
  receipt, cats, cards, users, onCancel, onDone,
}: {
  receipt: Receipt;
  cats: Category[];
  cards: Card[];
  users: User[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(receipt.parsedDate ?? new Date().toISOString().slice(0, 10));
  const [amountStr, setAmountStr] = useState(receipt.parsedTotal ? (receipt.parsedTotal / 100).toFixed(2) : "");
  const [merchant, setMerchant] = useState(receipt.parsedMerchant ?? "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [cardId, setCardId] = useState<string>(() => {
    if (!receipt.parsedCardLastFour) return "";
    const hit = cards.find((c) => c.lastFour === receipt.parsedCardLastFour);
    return hit ? String(hit.id) : "";
  });
  const [paidBy, setPaidBy] = useState<string>("");

  async function confirm() {
    const amount = Math.round(parseFloat(amountStr.replace(",", ".")) * 100);
    const split = users.length === 2 ? { [users[0]!.id]: 50, [users[1]!.id]: 50 } : {};
    await api.post(`/api/receipts/${receipt.id}/confirm`, {
      occurredOn: date,
      amount,
      merchantName: merchant || null,
      categoryId: categoryId ? Number(categoryId) : null,
      cardId: cardId ? Number(cardId) : null,
      paidByUserId: paidBy ? Number(paidBy) : null,
      split,
    });
    onDone();
  }

  return (
    <div className="min-h-screen p-4 bg-bg">
      <div className="max-w-md mx-auto space-y-4">
        <img src={`/api/receipts/${receipt.id}/image`} alt="" className="w-full card" />

        <div className="card card-body space-y-3">
          <h2 className="font-semibold">Review & save</h2>
          <div className="text-xs text-muted">
            OCR confidence: {receipt.ocrConfidence ?? "..."}%
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Total (NOK)</label>
              <input inputMode="decimal" className="input" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Merchant</label>
            <input className="input" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">(none)</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Card</label>
              <select className="input" value={cardId} onChange={(e) => setCardId(e.target.value)}>
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
          {amountStr && (
            <div className="text-sm text-muted">Preview: {formatMoney(Math.round(parseFloat(amountStr.replace(",", ".")) * 100 || 0))}</div>
          )}
          <div className="flex gap-2 pt-2">
            <button className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>
            <button className="btn-primary flex-1" onClick={confirm}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
