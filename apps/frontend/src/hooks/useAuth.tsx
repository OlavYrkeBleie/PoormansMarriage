import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { User } from "../lib/types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (name: string, password: string) => Promise<void>;
  register: (name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<User>("/api/auth/me").then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  async function login(displayName: string, password: string) {
    const u = await api.post<User>("/api/auth/login", { displayName, password });
    setUser(u);
  }
  async function register(displayName: string, password: string) {
    const u = await api.post<User>("/api/auth/register", { displayName, password });
    setUser(u);
  }
  async function logout() {
    await api.post("/api/auth/logout");
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
