import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../lib/api";
import type { Receipt } from "../lib/types";

export function ReceiptsPage() {
  const [rows, setRows] = useState<Receipt[]>([]);
  async function load() {
    setRows(await api.get<Receipt[]>("/api/receipts"));
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <h1 className="section-title">Receipts <span className="text-xxs text-muted font-normal">({rows.length})</span></h1>
        <Link to="/receipts/new" className="btn-primary">Capture new</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {rows.length === 0 && (
          <div className="col-span-full card card-body text-sm text-muted">
            No receipts yet. Tap "Capture new" and take one.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="card">
            <img src={`/api/receipts/${r.id}/image`} alt="" className="w-full aspect-[3/4] object-cover" style={{ background: "rgb(var(--bg))" }} />
            <div className="p-2 text-xs border-t border-border">
              <div className="font-medium truncate">{r.parsedMerchant ?? "Processing..."}</div>
              <div className="text-muted tabular mt-0.5">
                {r.parsedDate ?? "-"} &middot; {r.parsedTotal ? formatMoney(r.parsedTotal) : "-"}
              </div>
              <div className="text-xxs uppercase mt-1" style={{ color: r.status === "CONFIRMED" ? "rgb(var(--ok))" : "rgb(var(--muted))" }}>
                {r.status.toLowerCase().replace("_", " ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
