import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2 } from "lucide-react";
import { clientApi } from "@/api/public";
import { Badge } from "@/components/ui/badge";

export function AccountReservationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["client-reservations"],
    queryFn: clientApi.reservations,
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl tracking-tight">Mes réservations</h2>
      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-secondary/40" />}
      {!isLoading && data?.results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 py-16 text-center text-sm text-muted-foreground">
          Aucune réservation.
        </div>
      )}
      <div className="space-y-3">
        {data?.results.map((r) => (
          <article key={r.id} className="flex items-center justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta-soft text-terracotta">
                <CalendarCheck2 className="h-4 w-4" />
              </span>
              <div>
                <div className="font-display text-lg tracking-tight">
                  {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} • {r.time.slice(0, 5)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {r.guests} personne{r.guests > 1 ? "s" : ""}
                  {r.table_number ? ` • Table ${r.table_number}` : ""}
                </div>
              </div>
            </div>
            <Badge variant={r.status === "CONFIRMED" ? "success" : r.status === "CANCELLED" ? "danger" : "accent"}>
              {r.status_display}
            </Badge>
          </article>
        ))}
      </div>
    </div>
  );
}
