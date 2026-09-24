import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Flame, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { staffApi, type Order, type OrderItem } from "@/api/staff";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const POLL_MS = 5_000;

export function KdsPage() {
  const qc = useQueryClient();
  const { data: orders } = useQuery({
    queryKey: ["kds-orders"],
    queryFn: staffApi.kdsOrders,
    refetchInterval: POLL_MS,
  });

  const start = useMutation({
    mutationFn: staffApi.kdsStartItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kds-orders"] }),
  });
  const ready = useMutation({
    mutationFn: staffApi.kdsReadyItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kds-orders"] }),
  });

  // Flatten items into {item, order} pairs for easy column sorting
  const pairs = useMemo(() => {
    const out: { order: Order; item: OrderItem }[] = [];
    for (const o of orders ?? []) for (const i of o.items) out.push({ order: o, item: i });
    return out;
  }, [orders]);

  const pending = pairs.filter((p) => p.item.status === "PENDING");
  const preparing = pairs.filter((p) => p.item.status === "PREPARING");
  const done = pairs.filter((p) => p.item.status === "READY");

  // Sound on new pending ticket
  useNewTicketSound(pending.length);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Kitchen Display System</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">Cuisine</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--olive))] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--olive))]" />
          </span>
          Actualisation auto toutes les {POLL_MS / 1000}s
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Column
          title="Nouvelles"
          icon={<Clock className="h-4 w-4" />}
          tone="new"
          count={pending.length}
        >
          <AnimatePresence>
            {pending.map(({ order, item }) => (
              <Ticket
                key={item.id}
                order={order}
                item={item}
                action={
                  <Button variant="accent" size="sm" className="w-full" onClick={() => start.mutate(item.id)}>
                    Commencer
                  </Button>
                }
              />
            ))}
          </AnimatePresence>
        </Column>
        <Column
          title="En préparation"
          icon={<Flame className="h-4 w-4" />}
          tone="cooking"
          count={preparing.length}
        >
          <AnimatePresence>
            {preparing.map(({ order, item }) => (
              <Ticket
                key={item.id}
                order={order}
                item={item}
                action={
                  <Button variant="default" size="sm" className="w-full" onClick={() => ready.mutate(item.id)}>
                    Marquer prêt
                  </Button>
                }
                tone="cooking"
              />
            ))}
          </AnimatePresence>
        </Column>
        <Column
          title="Prêtes"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="done"
          count={done.length}
        >
          <AnimatePresence>
            {done.map(({ order, item }) => (
              <Ticket key={item.id} order={order} item={item} tone="done" />
            ))}
          </AnimatePresence>
        </Column>
      </div>
    </div>
  );
}

function Column({
  title,
  icon,
  tone,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "new" | "cooking" | "done";
  count: number;
  children: React.ReactNode;
}) {
  const header =
    tone === "new"
      ? "text-terracotta"
      : tone === "cooking"
        ? "text-amber-700"
        : "text-[hsl(var(--olive))]";
  return (
    <section className="rounded-2xl border border-border/70 bg-card/40 p-4">
      <header className="mb-4 flex items-center justify-between px-2">
        <h2 className={cn("flex items-center gap-2 font-display text-base font-semibold tracking-tight", header)}>
          {icon} {title}
        </h2>
        <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold tabular-nums">
          {count}
        </span>
      </header>
      <div className="space-y-3">
        {count === 0 && (
          <div className="rounded-xl border border-dashed border-border/70 py-10 text-center text-xs text-muted-foreground">
            Rien pour l'instant.
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

function Ticket({
  order,
  item,
  action,
  tone = "new",
}: {
  order: Order;
  item: OrderItem;
  action?: React.ReactNode;
  tone?: "new" | "cooking" | "done";
}) {
  const ring =
    tone === "cooking"
      ? "ring-amber-500/30"
      : tone === "done"
        ? "ring-[hsl(var(--olive)/0.25)]"
        : "ring-border";
  const elapsed = useElapsed(order.created_at);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl bg-card p-4 shadow-soft ring-1 transition-all",
        ring
      )}
    >
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>#{order.id} • Table {order.table_number ?? "—"}</span>
        <span className="tabular-nums">{elapsed}</span>
      </div>
      <div className="font-display text-lg leading-tight tracking-tight">
        {item.quantity}× {item.dish_name}
      </div>
      {item.notes && (
        <p className="mt-1.5 text-xs italic text-muted-foreground">« {item.notes} »</p>
      )}
      <div className="mt-2 text-xs text-muted-foreground">
        Temps estimé : {item.dish_prep_time} min
      </div>
      {action && <div className="mt-4">{action}</div>}
    </motion.article>
  );
}

function useElapsed(iso: string) {
  const [, bump] = useState(0);
  useEffect(() => {
    const t = setInterval(() => bump((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [iso]);
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  return `${mins} min`;
}

/** Play a subtle tick whenever new items enter "pending". */
function useNewTicketSound(currentPending: number) {
  const prev = useRef(currentPending);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (currentPending > prev.current) {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain).connect(ctx.destination);
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } catch {
        // autoplay policy — ignore
      }
    }
    prev.current = currentPending;
  }, [currentPending]);
}
