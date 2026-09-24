import { useQuery } from "@tanstack/react-query";
import { clientApi } from "@/api/public";
import { Badge } from "@/components/ui/badge";

const fmtMAD = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });

export function AccountOrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["client-orders"], queryFn: clientApi.orders });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl tracking-tight">Historique de commandes</h2>
      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-secondary/40" />}
      {!isLoading && data?.results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 py-16 text-center text-sm text-muted-foreground">
          Pas encore de commande.
        </div>
      )}
      <div className="space-y-3">
        {data?.results.map((o) => (
          <article key={o.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <div className="mt-1 font-display text-xl tracking-tight">
                  Commande #{o.id}
                  {o.table_number && <span className="ml-2 text-sm text-muted-foreground">• Table {o.table_number}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={o.status === "PAID" ? "success" : "default"}>{o.status_display}</Badge>
                <span className="font-display text-lg tabular-nums tracking-tight">{fmtMAD.format(Number(o.total))}</span>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between text-muted-foreground">
                  <span>
                    {i.quantity}× <span className="text-foreground">{i.dish_name}</span>
                  </span>
                  <span className="tabular-nums">{fmtMAD.format(Number(i.unit_price) * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
