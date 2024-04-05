import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { ExpenseFormPage } from "./pages/ExpenseFormPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import { ReceiptUploadPage } from "./pages/ReceiptUploadPage";
import { BankPage } from "./pages/BankPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TrendsPage } from "./pages/TrendsPage";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/receipts/new" element={<Protected><ReceiptUploadPage /></Protected>} />
        <Route element={<Protected><Shell /></Protected>}>
          <Route index element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/expenses/new" element={<ExpenseFormPage />} />
          <Route path="/expenses/:id" element={<ExpenseFormPage />} />
          <Route path="/receipts" element={<ReceiptsPage />} />
          <Route path="/bank" element={<BankPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings/*" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
