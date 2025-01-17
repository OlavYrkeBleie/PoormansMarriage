import { useEffect, useRef, useState } from "react";
import { api, formatMoney } from "../lib/api";
import type { BankTransaction } from "../lib/types";

const STATUS_LABEL: Record<BankTransaction["matchStatus"], string> = {
  UNMATCHED: "Unmatched",
  AUTO_MATCHED: "Auto-matched",
  MANUAL_MATCHED: "Matched",
  NO_RECEIPT_REQUIRED: "Invoice (no receipt)",
  MISSING_RECEIPT: "Missing receipt",
};

interface SupportedBank { id: string; label: string }

export function BankPage() {
  const [rows, setRows] = useState<BankTransaction[]>([]);
  const [status, setStatus] = useState<BankTransaction["matchStatus"]>("UNMATCHED");
  const [bank, setBank] = useState("sparebank1");
  const [banks, setBanks] = useState<SupportedBank[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setRows(await api.get<BankTransaction[]>(`/api/bank/transactions?status=${status}`));
  }
  useEffect(() => { load(); }, [status]);

  useEffect(() => {
    api.get<SupportedBank[]>("/api/bank/supported")
      .then((bs) => { setBanks(bs); if (bs[0]) setBank(bs[0].id); })
      .catch(() => {});
  }, []);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("csv", f);
    fd.append("bank", bank);
    try {
      const res = await api.post<{ inserted: number; skipped: number; autoMatched: number }>("/api/bank/import", fd);
      setMsg(`Imported ${res.inserted}, auto-matched ${res.autoMatched}, skipped ${res.skipped} duplicate(s).`);
    } catch (err: any) {
      setMsg(`Import failed: ${err.message || "unknown error"}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      await load();
    }
  }

  async function action(tx: BankTransaction, kind: "no_receipt_needed" | "missing_receipt") {
    await api.post(`/api/bank/transactions/${tx.id}/action`, { action: kind });
    await load();
  }

  return (
    <div className="space-y-3">
      <h1 className="section-title">Bank inbox</h1>
      <p className="text-sm text-muted">Import a bank CSV, then reconcile unmatched rows against receipts.</p>

      <div className="card">
        <div className="panel-header">Import</div>
        <div className="card-body flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Bank</label>
            <select className="input w-56" value={bank} onChange={(e) => setBank(e.target.value)}>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={upload} />
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>Import CSV</button>
          {msg && <div className="text-sm text-muted">{msg}</div>}
        </div>
      </div>

      <div className="flex">
        {(Object.keys(STATUS_LABEL) as Array<BankTransaction["matchStatus"]>).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`tab ${status === s ? "active" : ""}`}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: -1 }}>
        <div className="data-head">
          <div className="w-24">Date</div>
          <div>Description</div>
          <div>Amount</div>
          <div>Actions</div>
        </div>
        {rows.length === 0 && <div className="p-4 text-sm text-muted">Nothing in this bucket.</div>}
        {rows.map((t) => (
          <div key={t.id} className="data-row">
            <div className="w-24 text-xxs text-muted tabular">{t.transactionDate}</div>
            <div>
              <div className="font-medium truncate">{t.rawDescription}</div>
              <div className="text-xxs text-muted">{t.cardLastFour ? `Card ****${t.cardLastFour}` : "no card info"}</div>
            </div>
            <div className="font-medium tabular">{formatMoney(t.amount)}</div>
            <div className="flex gap-1">
              {t.matchStatus === "UNMATCHED" && (
                <>
                  <button className="btn-ghost text-xxs" onClick={() => action(t, "no_receipt_needed")}>No receipt needed</button>
                  <button className="btn-ghost text-xxs" onClick={() => action(t, "missing_receipt")}>Missing</button>
                </>
              )}
              {t.matchStatus !== "UNMATCHED" && <span className="text-xxs text-muted self-center">{STATUS_LABEL[t.matchStatus]}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
