import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { clientApi } from "@/api/public";

export function AccountReviewsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["client-my-reviews"],
    queryFn: clientApi.listReviews,
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl tracking-tight">Mes avis</h2>
      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-secondary/40" />}
      {!isLoading && data?.results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 py-16 text-center text-sm text-muted-foreground">
          Vous n'avez encore rien noté. Après une commande, vous pourrez laisser un avis depuis la page du plat.
        </div>
      )}
      <div className="space-y-3">
        {data?.results.map((r) => (
          <article key={r.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.dish_name}</div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={i < (r.rating ?? 0) ? "h-4 w-4 fill-terracotta text-terracotta" : "h-4 w-4 text-border"}
                  />
                ))}
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.comment || "—"}</p>
            <p className="mt-3 text-xs text-muted-foreground/70">
              {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
