import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Category } from "../../lib/types";

export function CategoriesSettings() {
  const [cats, setCats] = useState<Category[]>([]);

  async function load() {
    setCats(await api.get<Category[]>("/api/categories"));
  }
  useEffect(() => { load(); }, []);

  async function toggleReceipt(c: Category) {
    await api.patch(`/api/categories/${c.id}`, { requiresReceipt: !c.requiresReceipt });
    await load();
  }

  return (
    <div className="card">
      <div className="panel-header">Categories</div>
      <div className="data-head" style={{ gridTemplateColumns: "2fr 1fr auto" }}>
        <div>Name</div>
        <div>Group</div>
        <div>Receipt required?</div>
      </div>
      {cats.map((c) => (
        <div key={c.id} className="data-row" style={{ gridTemplateColumns: "2fr 1fr auto" }}>
          <div className="font-medium">{c.name}</div>
          <div className="text-xxs uppercase text-muted">{c.group}</div>
          <button className="btn-ghost text-xxs" onClick={() => toggleReceipt(c)}>
            {c.requiresReceipt ? "Yes" : "No"}
          </button>
        </div>
      ))}
    </div>
  );
}
