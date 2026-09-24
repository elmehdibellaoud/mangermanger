import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Brain,
  Briefcase,
  CalendarCheck2,
  ChefHat,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Package,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { fetchMe, logout } from "@/api/auth";

const NAV = [
  { to: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/menu", label: "Menu", icon: ChefHat },
  { to: "/admin/stock", label: "Stock", icon: Package },
  { to: "/admin/reservations", label: "Réservations", icon: CalendarCheck2 },
  { to: "/admin/staff", label: "Équipe", icon: Users },
  { to: "/admin/jobs", label: "Recrutement", icon: Briefcase },
  { to: "/admin/reviews", label: "Avis", icon: MessageSquareText },
  { to: "/admin/sentiment-playground", label: "IA Sentiment", icon: Brain },
];

export function AdminLayout() {
  const { user, setUser, logout: doLogout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If no user in store but token exists, hydrate
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) {
          if (me.role !== "GERANT") {
            navigate("/login");
            return;
          }
          setUser({ id: me.id, email: me.email, role: me.role, firstName: me.first_name });
        }
      } catch {
        if (!cancelled) navigate("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, setUser]);

  function onLogout() {
    logout();
    doLogout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-[260px_1fr]">
        <aside className="flex flex-col border-r border-border/70 bg-card/40">
          <div className="flex h-20 items-center gap-2 px-6">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-accent-foreground shadow-glow">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            <div>
              <div className="font-display text-lg font-semibold tracking-tight leading-none">
                manger<span className="text-terracotta">manger</span>
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Back-office
              </div>
            </div>
          </div>
          <nav className="mt-4 flex-1 space-y-1 px-3">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-terracotta-soft text-terracotta"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border/70 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                {user?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "G"}
              </div>
              <div className="min-w-0 text-sm">
                <div className="truncate font-medium">{user?.firstName ?? "Gérant"}</div>
                <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout} className="w-full justify-start">
              <LogOut className="h-4 w-4" /> Se déconnecter
            </Button>
          </div>
        </aside>
        <main className="flex flex-col">
          <div className="flex h-20 items-center justify-between border-b border-border/70 px-8">
            <h1 className="font-display text-2xl tracking-tight text-foreground">
              <PageTitle />
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden md:inline">
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
          </div>
          <div className="flex-1 px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function PageTitle() {
  const path = window.location.pathname;
  const match = NAV.find((n) => path.startsWith(n.to));
  return <>{match?.label ?? "Admin"}</>;
}
