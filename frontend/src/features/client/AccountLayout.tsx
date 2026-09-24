import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Heart, Receipt, Sparkles, Star, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { fetchMe } from "@/api/auth";

const NAV = [
  { to: "/account", end: true, label: "Profil", icon: UserIcon },
  { to: "/account/orders", label: "Mes commandes", icon: Receipt },
  { to: "/account/reservations", label: "Réservations", icon: Heart },
  { to: "/account/reviews", label: "Mes avis", icon: Star },
  { to: "/account/recommendations", label: "Pour vous", icon: Sparkles },
];

export function AccountLayout() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setUser({ id: me.id, email: me.email, role: me.role, firstName: me.first_name });
      } catch {
        if (!cancelled) navigate("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, setUser]);

  return (
    <div className="container py-12">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Mon espace</p>
        <h1 className="mt-3 font-display text-display-lg font-medium">Bonjour</h1>
      </header>
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
        </aside>
        <section>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
