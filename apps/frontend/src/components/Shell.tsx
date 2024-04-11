import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/expenses", label: "Expenses" },
  { to: "/receipts", label: "Receipts" },
  { to: "/bank", label: "Bank inbox" },
  { to: "/trends", label: "Trends" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/expenses": "Expenses",
  "/receipts": "Receipts",
  "/bank": "Bank inbox",
  "/trends": "Trends & Forecast",
  "/reports": "Reports",
  "/settings": "Settings",
};

function currentTitle(path: string): string {
  if (path === "/") return PAGE_TITLES["/"]!;
  for (const key of Object.keys(PAGE_TITLES).sort((a, b) => b.length - a.length)) {
    if (key !== "/" && path.startsWith(key)) return PAGE_TITLES[key]!;
  }
  return "Poorman's Marriage";
}

export function Shell() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const loc = useLocation();

  const title = currentTitle(loc.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Title bar — desktop only */}
      <div className="hidden md:flex items-center px-2 h-7 text-xxs"
           style={{ background: "linear-gradient(to bottom, rgb(var(--titlebar)) 0%, rgb(var(--bg)) 100%)",
                    borderBottom: "1px solid rgb(var(--border))" }}>
        <span className="font-semibold text-muted">Poorman's Marriage — {title}</span>
        <span className="ml-auto text-muted">{user?.displayName}</span>
      </div>

      {/* Menu bar — desktop */}
      <nav className="hidden md:flex items-stretch px-1 gap-0 h-7 text-[13px]"
           style={{ background: "rgb(var(--surface))", borderBottom: "1px solid rgb(var(--border))" }}>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              "inline-flex items-center px-3 " + (isActive ? "font-semibold" : "") +
              (isActive ? " bg-accent-bg" : " hover:bg-[rgb(var(--titlebar))]")
            }
          >
            {n.label}
          </NavLink>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-1">
          <button className="btn-ghost h-6 py-0 px-2 text-xxs" onClick={toggle} title="Toggle theme">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button className="btn-ghost h-6 py-0 px-2 text-xxs"
                  onClick={async () => { await logout(); navigate("/login"); }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Phone top bar */}
      <nav className="md:hidden flex items-center justify-between px-3 py-2 border-b border-border"
           style={{ background: "rgb(var(--surface))" }}>
        <div className="font-semibold">{title}</div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={toggle}>{theme === "dark" ? "Light" : "Dark"}</button>
          <button className="btn-ghost" onClick={async () => { await logout(); navigate("/login"); }}>Sign out</button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-3 md:p-4">
          <Outlet />
        </div>

        {/* Phone bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border flex"
             style={{ background: "rgb(var(--surface))" }}>
          {NAV.filter((n) => ["/", "/expenses", "/receipts", "/bank", "/trends"].includes(n.to)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex-1 text-center py-2.5 text-xs ${isActive ? "font-semibold text-accent" : "text-muted"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
        <div className="md:hidden" style={{ height: 56 }} />
      </main>

      {/* Status bar — desktop */}
      <div className="hidden md:flex items-center px-3 h-5 text-xxs text-muted"
           style={{ background: "rgb(var(--bg))", borderTop: "1px solid rgb(var(--border))" }}>
        <span>Ready</span>
        <span className="ml-auto">Logged in as {user?.displayName}</span>
      </div>
    </div>
  );
}
