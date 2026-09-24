import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CalendarCheck2, Check, Clock, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { publicApi, type Reservation } from "@/api/public";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TIMES = ["12:00", "12:30", "13:00", "13:30", "14:00", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];

export function ReservationPage() {
  const user = useAuth((s) => s.user);
  const [step, setStep] = useState<"form" | "done">("form");
  const [confirmed, setConfirmed] = useState<Reservation | null>(null);

  const [form, setForm] = useState({
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    time: "20:00",
    guests: 2,
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    notes: "",
  });

  const create = useMutation({
    mutationFn: publicApi.reservations.create,
    onSuccess: (r) => {
      setConfirmed(r);
      setStep("done");
    },
  });

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <header className="text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Réservation</p>
                <h1 className="mt-4 font-display text-display-lg font-medium">
                  Réservez <span className="italic text-terracotta">votre table</span>
                </h1>
                <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                  Un email de confirmation vous sera envoyé sous quelques minutes.
                </p>
              </header>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate(user ? form : { ...form });
                }}
                className="mt-10 space-y-6 rounded-2xl border border-border/70 bg-card p-8 shadow-soft"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">
                      <CalendarCheck2 className="mr-1 inline-block h-3.5 w-3.5" /> Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="guests">
                      <Users className="mr-1 inline-block h-3.5 w-3.5" /> Personnes
                    </Label>
                    <select
                      id="guests"
                      value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                      className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} personne{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>
                    <Clock className="mr-1 inline-block h-3.5 w-3.5" /> Heure
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TIMES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, time: t })}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          form.time === t
                            ? "border-transparent bg-terracotta text-accent-foreground shadow-glow"
                            : "border-border bg-card hover:bg-secondary"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {!user && (
                  <div className="space-y-4 rounded-xl border border-dashed border-border/70 bg-background/40 p-5">
                    <p className="text-xs text-muted-foreground">
                      Pas de compte ? Réservez en tant qu'invité — nous avons juste besoin de quelques infos.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nom</Label>
                        <Input
                          value={form.guest_name}
                          onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                          required
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Téléphone</Label>
                        <Input
                          value={form.guest_phone}
                          onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.guest_email}
                        onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
                        required
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Allergies, occasion (optionnel)</Label>
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  />
                </div>

                {create.isError && (
                  <p className="text-sm text-destructive">
                    {(create.error as { response?: { data?: { detail?: string } } })?.response?.data
                      ?.detail ?? "Impossible de réserver. Vérifiez les champs."}
                  </p>
                )}

                <Button type="submit" variant="accent" size="lg" className="w-full" disabled={create.isPending}>
                  {create.isPending ? "Réservation…" : "Confirmer la réservation"}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-border/70 bg-card p-10 text-center shadow-soft"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--olive)/0.15)] text-[hsl(var(--olive))]">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="mt-6 font-display text-3xl tracking-tight">
                Réservation {confirmed?.status === "CONFIRMED" ? "confirmée" : "enregistrée"} !
              </h2>
              <p className="mt-3 text-muted-foreground">
                Nous vous attendons <b className="text-foreground">{confirmed?.date}</b> à{" "}
                <b className="text-foreground">{confirmed?.time?.slice(0, 5)}</b> pour{" "}
                <b className="text-foreground">{confirmed?.guests} personne{confirmed && confirmed.guests > 1 ? "s" : ""}</b>.
              </p>
              {confirmed?.table_number && (
                <p className="mt-2 text-sm text-muted-foreground">Table n° {confirmed.table_number}</p>
              )}
              <Button variant="accent" className="mt-8" onClick={() => setStep("form")}>
                Nouvelle réservation
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
