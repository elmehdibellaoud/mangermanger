import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/auth";
import { logout } from "@/api/auth";

const LINKS = [
  { to: "/", label: "Accueil", end: true },
  { to: "/menu", label: "Menu" },
  { to: "/reservation", label: "Réserver" },
];

export function PublicLayout() {
  const { user, logout: doLogout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    doLogout();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-accent-foreground shadow-glow">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              manger<span className="text-terracotta">manger</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user && user.role === "CLIENT" ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/account">
                    <UserIcon className="h-4 w-4" /> Mon compte
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Connexion</Link>
                </Button>
                <Button variant="accent" size="sm" asChild>
                  <Link to="/reservation">Réserver</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/70">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-8 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} MangerManger — Projet de Fin d'Année</span>
          <span>Fait avec soin à Casablanca</span>
        </div>
      </footer>
    </div>
  );
}
