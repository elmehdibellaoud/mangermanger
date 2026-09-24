import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { staffApi } from "@/api/staff";
import { Badge } from "@/components/ui/badge";

const fmtMAD = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });

const STATUS_VARIANT: Record<string, "default" | "accent" | "success" | "danger" | "outline"> = {
  DRAFT: "outline",
  SENT: "accent",
  PREPARING: "accent",
  READY: "success",
  SERVED: "success",
  PAID: "default",
  CANCELLED: "danger",
};

export function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["staff-orders", "mine"],
    queryFn: () => staffApi.listOrders({ mine: true }),
    refetchInterval: 6_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Historique</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">Mes commandes</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Table</th>
              <th className="px-4 py-3 font-medium">Plats</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium">Heure</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-3 w-40 animate-pulse rounded bg-secondary" />
                  </td>
                </tr>
              ))}
            {!isLoading && !data?.results.length && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  Aucune commande pour le moment.
                </td>
              </tr>
            )}
            {data?.results.map((o) => (
              <tr key={o.id} className="border-b border-border/50 last:border-b-0 hover:bg-secondary/40">
                <td className="px-4 py-3 font-mono text-xs">#{o.id}</td>
                <td className="px-4 py-3">
                  {o.table_number ? (
                    <Link to={`/staff/tables/${o.table}`} className="font-medium text-foreground hover:text-terracotta">
                      Table {o.table_number}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{o.items.length}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[o.status]}>{o.status_display}</Badge>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {fmtMAD.format(Number(o.total))}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
