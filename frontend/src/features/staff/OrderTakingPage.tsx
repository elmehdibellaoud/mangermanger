import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Search, Send, Sparkles, Trash2, UserCircle, UserPlus, UserX, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { staffApi, type ClientLite, type Order, type PublicDish, type Table } from "@/api/staff";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fmtMAD = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });

export function OrderTakingPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeCat, setActiveCat] = useState<number | null>(null);

  const { data: tables } = useQuery({ queryKey: ["staff-tables"], queryFn: staffApi.listTables });
  const table = tables?.find((t) => t.id === Number(tableId));

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["public-menu"],
    queryFn: staffApi.publicMenu,
  });

  const orderId = table?.active_order_id ?? null;
  const { data: order } = useQuery({
    queryKey: ["staff-order", orderId],
    queryFn: () => staffApi.getOrder(orderId!),
    enabled: !!orderId,
  });

  const createOrder = useMutation({
    mutationFn: (clientId?: number | null) =>
      staffApi.createOrder({ table: Number(tableId), client: clientId ?? null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-tables"] });
    },
  });

  async function addDish(dish: PublicDish) {
    let id = orderId;
    if (!id) {
      // Auto-attach to the table's reserved client if any
      const reservedClientId = table?.today_reservation?.client_id ?? null;
      const o = await createOrder.mutateAsync(reservedClientId);
      id = o.id;
    }
    await staffApi.addItem(id, { dish: dish.id, quantity: 1 });
    qc.invalidateQueries({ queryKey: ["staff-order", id] });
    qc.invalidateQueries({ queryKey: ["staff-tables"] });
  }

  const send = useMutation({
    mutationFn: () => staffApi.sendOrder(orderId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-order", orderId] }),
  });

  const pay = useMutation({
    mutationFn: () => staffApi.payOrder(orderId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-order", orderId] });
      qc.invalidateQueries({ queryKey: ["staff-tables"] });
      navigate("/staff/tables");
    },
  });

  const categories = menu ?? [];
  const currentCat = categories.find((c) => c.id === activeCat) ?? categories[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff/tables")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Prise de commande</p>
            <h1 className="font-display text-2xl tracking-tight">
              Table {table?.number} — <span className="text-muted-foreground">{table?.capacity}p</span>
            </h1>
          </div>
        </div>

        {table && <ReservationBanner table={table} order={order ?? null} />}

        <div className="flex flex-wrap gap-2 border-b border-border/70 pb-3">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                (currentCat?.id ?? -1) === c.id
                  ? "bg-terracotta text-accent-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {menuLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary/60" />
            ))}
          {currentCat?.dishes.map((d) => (
            <motion.button
              key={d.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => addDish(d)}
              className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-left shadow-soft transition-all hover:border-terracotta/40 hover:shadow-glow"
            >
              {d.image ? (
                <img src={d.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary text-xs text-muted-foreground">
                  {d.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium">{d.name}</div>
                <div className="line-clamp-1 text-xs text-muted-foreground">{d.description}</div>
              </div>
              <div className="tabular-nums text-sm font-semibold">{fmtMAD.format(Number(d.price))}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <Ticket order={order ?? null} onSend={() => send.mutate()} onPay={() => pay.mutate()} />
    </div>
  );
}

function ReservationBanner({ table, order }: { table: Table; order: Order | null }) {
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const resa = table.today_reservation;

  const linkedClientId = order?.client ?? null;
  const reservedClientId = resa?.client_id ?? null;
  const needsLink = resa && reservedClientId && order && linkedClientId !== reservedClientId;

  const attach = useMutation({
    mutationFn: (clientId: number | null) => staffApi.attachClient(order!.id, clientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-order", order?.id] });
    },
  });

  // If the table has a reservation and an order exists
  if (resa && !reservedClientId) {
    return (
      <div className="rounded-xl border border-terracotta/20 bg-terracotta-soft/40 px-4 py-3">
        <div className="flex items-start gap-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 text-terracotta" />
          <div>
            <p>
              <span className="font-medium text-terracotta">Réservation (invité)</span> à{" "}
              {resa.time} pour {resa.guests} couverts — <span className="font-medium">{resa.name}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pas de compte client. La commande ne sera pas rattachée à un profil.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (resa && reservedClientId) {
    return (
      <div className="rounded-xl border border-terracotta/30 bg-terracotta-soft px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 text-terracotta" />
            <div>
              <p>
                <span className="font-medium text-terracotta">Réservation à {resa.time}</span> —{" "}
                <span className="font-medium">{resa.name}</span> ({resa.guests} couverts)
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Client enregistré — ses points fidélité seront crédités automatiquement.
              </p>
            </div>
          </div>
          {order && needsLink && (
            <Button
              size="sm"
              variant="accent"
              onClick={() => attach.mutate(reservedClientId)}
              disabled={attach.isPending}
            >
              <Check className="h-3.5 w-3.5" /> Associer
            </Button>
          )}
          {order && linkedClientId === reservedClientId && (
            <Badge variant="success">
              <Check className="h-3 w-3" /> Associée
            </Badge>
          )}
        </div>
      </div>
    );
  }

  // Walk-in — no reservation. Offer to search for a client manually.
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <div>
            {linkedClientId ? (
              <ClientPill orderId={order!.id} clientId={linkedClientId} />
            ) : (
              <span className="text-muted-foreground">
                Walk-in — aucun client associé. {order ? "Vous pouvez en chercher un." : ""}
              </span>
            )}
          </div>
        </div>
        {order && !linkedClientId && !searchOpen && (
          <Button size="sm" variant="outline" onClick={() => setSearchOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Chercher un client
          </Button>
        )}
      </div>
      {searchOpen && order && !linkedClientId && (
        <ClientSearch
          onPick={(c) => {
            attach.mutate(c.id);
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

function ClientPill({ orderId, clientId }: { orderId: number; clientId: number }) {
  const qc = useQueryClient();
  const detach = useMutation({
    mutationFn: () => staffApi.attachClient(orderId, null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-order", orderId] }),
  });
  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant="accent">
        <UserCircle className="h-3 w-3" /> Client ID #{clientId}
      </Badge>
      <button
        type="button"
        onClick={() => detach.mutate()}
        className="text-xs text-muted-foreground hover:text-destructive"
      >
        Retirer
      </button>
    </span>
  );
}

function ClientSearch({
  onPick,
  onClose,
}: {
  onPick: (c: ClientLite) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["staff-client-search", q],
    queryFn: () => staffApi.searchClients(q),
    enabled: q.length >= 2,
  });
  return (
    <div className="mt-3 border-t border-border/70 pt-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Chercher par email ou nom…"
          className="h-10 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {q.length >= 2 && data && (
        <ul className="mt-2 max-h-44 overflow-auto rounded-md border border-border bg-card text-sm">
          {data.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Aucun résultat.</li>
          )}
          {data.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-terracotta-soft text-xs font-semibold text-terracotta">
                  {(c.first_name?.[0] ?? c.email[0]).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
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
      <button
        type="button"
        onClick={onClose}
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <UserX className="h-3 w-3" /> Fermer
      </button>
    </div>
  );
}

function Ticket({
  order,
  onSend,
  onPay,
}: {
  order: Order | null;
  onSend: () => void;
  onPay: () => void;
}) {
  const qc = useQueryClient();
  const removeItem = useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: number; itemId: number }) =>
      staffApi.removeItem(orderId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-order", order?.id] }),
  });

  return (
    <aside className="sticky top-6 h-fit rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl tracking-tight">Ticket</h2>
        {order ? (
          <Badge variant="accent">{order.status_display}</Badge>
        ) : (
          <Badge variant="outline">Vide</Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {order?.items.length ? (
            order.items.map((i) => (
              <motion.div
                key={i.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary/60"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-terracotta-soft text-xs font-semibold text-terracotta">
                  {i.quantity}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{i.dish_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtMAD.format(Number(i.unit_price))} × {i.quantity}
                  </div>
                </div>
                <div className="tabular-nums text-sm font-semibold">
                  {fmtMAD.format(Number(i.unit_price) * i.quantity)}
                </div>
                {order.status === "DRAFT" && (
                  <button
                    onClick={() => removeItem.mutate({ orderId: order.id, itemId: i.id })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tapez sur un plat pour l'ajouter au ticket.
            </p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 border-t border-border/70 pt-4">
        <div className="flex items-end justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-display text-2xl tabular-nums tracking-tight">
            {fmtMAD.format(Number(order?.total ?? 0))}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {order?.status === "DRAFT" && (
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={onSend}
            disabled={!order.items.length}
          >
            <Send className="h-4 w-4" /> Envoyer en cuisine
          </Button>
        )}
        {order?.status === "SENT" && (
          <Badge variant="accent" className="w-full justify-center py-2.5 text-xs">
            Envoyée — en attente cuisine
          </Badge>
        )}
        {order?.status === "PREPARING" && (
          <Badge variant="accent" className="w-full justify-center py-2.5 text-xs">
            En préparation
          </Badge>
        )}
        {(order?.status === "READY" || order?.status === "SERVED") && (
          <Button variant="accent" size="lg" className="w-full" onClick={onPay}>
            <Wallet className="h-4 w-4" /> Marquer payée
          </Button>
        )}
      </div>
    </aside>
  );
}
