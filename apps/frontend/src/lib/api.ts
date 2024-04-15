export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!resp.ok) {
    let msg = resp.statusText;
    try { const j = await resp.json(); msg = j.error ?? msg; } catch {}
    throw new ApiError(resp.status, msg);
  }
  if (resp.status === 204) return undefined as T;
  const ct = resp.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return resp.json();
  return resp.text() as any;
}

export const api = {
  get:   <T>(p: string) => request<T>(p),
  post:  <T>(p: string, body?: any) => request<T>(p, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(p: string, body?: any) => request<T>(p, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del:   <T>(p: string) => request<T>(p, { method: "DELETE" }),
};

export function formatMoney(minor: number, currency = "NOK"): string {
  const n = minor / 100;
  try {
    return new Intl.NumberFormat("nb-NO", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}
