import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ChefHat, LayoutGrid, LogOut, UtensilsCrossed, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { fetchMe, logout } from "@/api/auth";

export function StaffLayout() {
  const { user, setUser, logout: doLogout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me.role !== "SERVEUR" && me.role !== "CUISINIER" && me.role !== "GERANT") {
          navigate("/login");
          return;
        }
        setUser({ id: me.id, email: me.email, role: me.role, firstName: me.first_name });
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

  const isKitchen = user?.role === "CUISINIER";

  const nav = isKitchen
    ? [{ to: "/staff/kds", label: "Cuisine", icon: ChefHat }]
    : [
        { to: "/staff/tables", label: "Tables", icon: LayoutGrid },
        { to: "/staff/orders", label: "Mes commandes", icon: Receipt },
      ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/40">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-terracotta text-accent-foreground shadow-glow">
              <UtensilsCrossed className="h-3.5 w-3.5" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              manger<span className="text-terracotta">manger</span>
              <span className="ml-2 text-xs font-normal uppercase tracking-widest text-muted-foreground">
                {isKitchen ? "Cuisine" : "Salle"}
              </span>
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
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
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right text-xs md:block">
              <div className="font-medium">{user?.firstName ?? user?.email}</div>
              <div className="text-muted-foreground">
                {user?.role === "SERVEUR" ? "Serveur" : user?.role === "CUISINIER" ? "Cuisinier" : "Gérant"}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
