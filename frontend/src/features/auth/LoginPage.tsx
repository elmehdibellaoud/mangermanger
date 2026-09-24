import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, fetchMe } from "@/api/auth";
import { useAuth } from "@/store/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState("gerant@mangermanger.dev");
  const [password, setPassword] = useState("demo1234!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const me = await fetchMe();
      setUser({ id: me.id, email: me.email, role: me.role, firstName: me.first_name });
      if (me.role === "GERANT") navigate("/admin");
      else if (me.role === "SERVEUR") navigate("/staff/tables");
      else if (me.role === "CUISINIER") navigate("/staff/kds");
      else navigate("/account");
    } catch (err: unknown) {
      setError("Identifiants invalides");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-accent-foreground shadow-glow">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            manger<span className="text-terracotta">manger</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <h1 className="font-display text-2xl tracking-tight">Bon retour</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous à votre espace.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" variant="accent" size="lg" disabled={loading} className="w-full">
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Pas de compte ?{" "}
            <Link to="/register" className="text-terracotta hover:underline">
              Créer un compte client
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
