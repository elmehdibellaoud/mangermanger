import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { motion } from "framer-motion";
import { staffApi, type Table } from "@/api/staff";
import { cn } from "@/lib/utils";

const STATUS: Record<Table["status"], { label: string; classes: string }> = {
  FREE: {
    label: "Libre",
    classes: "border-[hsl(var(--olive)/0.3)] bg-[hsl(var(--olive)/0.08)] text-[hsl(var(--olive))]",
  },
  OCCUPIED: {
    label: "Occupée",
    classes: "border-terracotta/30 bg-terracotta-soft text-terracotta",
  },
  RESERVED: {
    label: "Réservée",
    classes: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
};

export function TablesPage() {
  const navigate = useNavigate();
  const { data: tables, isLoading } = useQuery({
    queryKey: ["staff-tables"],
    queryFn: staffApi.listTables,
    refetchInterval: 10_000,
  });

  const byStatus = (s: Table["status"]) => (tables ?? []).filter((t) => t.status === s).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Plan de salle</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">Tables</h1>
      </div>

      <div className="flex gap-3 text-xs">
        <Legend color="olive" label={`${byStatus("FREE")} libres`} />
        <Legend color="terracotta" label={`${byStatus("OCCUPIED")} occupées`} />
        <Legend color="amber" label={`${byStatus("RESERVED")} réservées`} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {isLoading &&
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-secondary/60" />
          ))}
        {!isLoading &&
          tables?.map((t, i) => {
            const s = STATUS[t.status];
            return (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
                onClick={() => navigate(`/staff/tables/${t.id}`)}
                className={cn(
                  "group relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl border-2 p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow",
                  s.classes
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="font-display text-3xl tracking-tight">Table {t.number}</div>
                  <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-widest">
                    {s.label}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {t.capacity}p
                  </span>
                  {t.active_order_id ? (
                    <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-medium">
                      Commande #{t.active_order_id}
                    </span>
                  ) : (
                    <span className="text-xs opacity-70">Prête à servir</span>
                  )}
                </div>
              </motion.button>
            );
          })}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const bg =
    color === "olive"
      ? "bg-[hsl(var(--olive))]"
      : color === "terracotta"
        ? "bg-terracotta"
        : "bg-amber-500";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
      <span className={cn("h-2 w-2 rounded-full", bg)} />
      {label}
    </span>
  );
}
