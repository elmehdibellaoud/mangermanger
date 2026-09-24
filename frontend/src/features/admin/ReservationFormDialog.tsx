import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserX } from "lucide-react";
import { clientsApi, reservationsApi, type AdminReservation, type ClientLite } from "@/api/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing: AdminReservation | null;
}

const TIMES = ["12:00", "12:30", "13:00", "13:30", "14:00", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];

export function ReservationFormDialog({ open, onOpenChange, existing }: Props) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<"client" | "guest">("guest");
  const [client, setClient] = useState<ClientLite | null>(null);
  const [form, setForm] = useState({
    date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    time: "20:00",
    guests: 2,
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    notes: "",
    status: "PENDING" as AdminReservation["status"],
  });

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setForm({
        date: existing.date,
        time: existing.time.slice(0, 5),
        guests: existing.guests,
        guest_name: existing.guest_name,
        guest_email: existing.guest_email,
        guest_phone: existing.guest_phone,
        notes: existing.notes,
        status: existing.status,
      });
      setKind(existing.client ? "client" : "guest");
      setClient(null); // we don't pre-resolve the client object; rely on existing.client id
    } else {
      setForm({
        date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        time: "20:00",
        guests: 2,
        guest_name: "",
        guest_email: "",
        guest_phone: "",
        notes: "",
        status: "PENDING",
      });
      setKind("guest");
      setClient(null);
    }
  }, [open, existing]);

  const save = useMutation({
    mutationFn: (payload: Partial<AdminReservation>) =>
      existing ? reservationsApi.update(existing.id, payload) : reservationsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reservations"] });
      onOpenChange(false);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Partial<AdminReservation> = {
      date: form.date,
      time: form.time,
      guests: form.guests,
      notes: form.notes,
      status: form.status,
    };
    if (kind === "client") {
      payload.client = client?.id ?? existing?.client ?? undefined;
      payload.guest_name = "";
      payload.guest_email = "";
      payload.guest_phone = "";
    } else {
      payload.client = null;
      payload.guest_name = form.guest_name;
      payload.guest_email = form.guest_email;
      payload.guest_phone = form.guest_phone;
    }
    save.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Modifier la réservation" : "Nouvelle réservation"}</DialogTitle>
          <DialogDescription>
            Associez à un client existant (fidélité + historique) ou saisissez un invité.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Couverts</Label>
              <select
                value={form.guests}
                onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} personne{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Heure</Label>
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

          <div className="flex gap-2 border-b border-border/70 pb-3">
            <TypePill active={kind === "guest"} onClick={() => setKind("guest")}>
              Invité
            </TypePill>
            <TypePill active={kind === "client"} onClick={() => setKind("client")}>
              Client enregistré
            </TypePill>
          </div>

          {kind === "client" ? (
            <ClientPicker value={client} onChange={setClient} existingClientId={existing?.client ?? null} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={form.guest_name}
                  onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                  required={kind === "guest"}
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
              <div className="col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.guest_email}
                  onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          {existing && (
            <div>
              <Label>Statut</Label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as AdminReservation["status"] })
                }
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="PENDING">En attente</option>
                <option value="CONFIRMED">Confirmée</option>
                <option value="SEATED">Installée</option>
                <option value="CANCELLED">Annulée</option>
              </select>
            </div>
          )}

          <div>
            <Label>Notes (allergies, occasion…)</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            />
          </div>

          {save.isError && (
            <p className="text-sm text-destructive">
              {(save.error as { response?: { data?: { detail?: string[] | string } } })?.response
                ?.data?.detail ?? "Erreur — vérifiez les champs."}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" variant="accent" disabled={save.isPending}>
              {save.isPending ? "Enregistrement…" : existing ? "Mettre à jour" : "Créer la réservation"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TypePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px px-4 py-2 text-sm font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-terracotta" />}
    </button>
  );
}

function ClientPicker({
  value,
  onChange,
  existingClientId,
}: {
  value: ClientLite | null;
  onChange: (c: ClientLite | null) => void;
  existingClientId: number | null;
}) {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["client-search", q],
    queryFn: () => clientsApi.search(q),
    enabled: q.length >= 2,
  });

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta-soft text-sm font-semibold text-terracotta">
            {(value.first_name?.[0] ?? value.email[0]).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">
              {value.first_name} {value.last_name}
            </div>
            <div className="text-xs text-muted-foreground">{value.email}</div>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange(null)}>
            <UserX className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Chercher un client par email ou nom…"
              className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {q.length >= 2 && data && data.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-card shadow-soft">
              {data.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c);
                      setQ("");
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-terracotta-soft text-xs font-semibold text-terracotta">
                      {(c.first_name?.[0] ?? c.email[0]).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {c.first_name} {c.last_name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.length >= 2 && data && data.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Aucun client trouvé.</p>
          )}
          {existingClientId && (
            <Badge variant="accent" className="mt-2">
              Client actuel ID #{existingClientId} conservé si non modifié
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
