import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerClient } from "@/api/public";
import { login, fetchMe } from "@/api/auth";
import { useAuth } from "@/store/auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerClient(form);
      await login(form.email, form.password);
      const me = await fetchMe();
      setUser({ id: me.id, email: me.email, role: me.role, firstName: me.first_name });
      navigate("/account");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      setError(
        msg ? Object.values(msg).flat().join(" ") : "Impossible de créer le compte."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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
          <h1 className="font-display text-2xl tracking-tight">Créer un compte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Réservez plus vite, gardez vos avis et gagnez des points fidélité.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prénom</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label>Nom</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="accent" size="lg" disabled={loading} className="w-full">
              {loading ? "Création…" : "Créer mon compte"}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Déjà inscrit ?{" "}
            <Link to="/login" className="text-terracotta hover:underline">
              Connectez-vous
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
