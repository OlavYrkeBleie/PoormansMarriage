import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      if (mode === "login") await login(name, pw);
      else await register(name, pw);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card card-body w-full max-w-sm">
        <h1 className="text-xl font-semibold">Poorman's Marriage</h1>
        <p className="text-sm text-muted mt-1">Shared household expense tracker</p>

        <form className="space-y-4 mt-6" onSubmit={submit}>
          <div>
            <label className="label">Display name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          {error && <div className="text-sm" style={{ color: "rgb(var(--danger))" }}>{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <button type="button" className="text-xs text-muted hover:text-text w-full" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "No account yet? Register" : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
