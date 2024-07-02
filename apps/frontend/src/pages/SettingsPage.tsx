import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { CardsSettings } from "./settings/CardsSettings";
import { CategoriesSettings } from "./settings/CategoriesSettings";
import { MerchantsSettings } from "./settings/MerchantsSettings";
import { RecurringSettings } from "./settings/RecurringSettings";
import { PhoneSettings } from "./settings/PhoneSettings";

const SUB = [
  { to: "cards", label: "Cards" },
  { to: "categories", label: "Categories" },
  { to: "merchants", label: "Learned merchants" },
  { to: "recurring", label: "Recurring bills" },
  { to: "phone", label: "Phone access" },
];

export function SettingsPage() {
  return (
    <div className="space-y-3">
      <h1 className="section-title">Settings</h1>
      <div className="flex flex-wrap">
        {SUB.map((s) => (
          <NavLink key={s.to} to={s.to} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
            {s.label}
          </NavLink>
        ))}
      </div>
      <div style={{ marginTop: -1 }}>
        <Routes>
          <Route index element={<Navigate to="cards" replace />} />
          <Route path="cards" element={<CardsSettings />} />
          <Route path="categories" element={<CategoriesSettings />} />
          <Route path="merchants" element={<MerchantsSettings />} />
          <Route path="recurring" element={<RecurringSettings />} />
          <Route path="phone" element={<PhoneSettings />} />
        </Routes>
      </div>
    </div>
  );
}
