import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { clientApi, type Recommendation } from "@/api/public";

const fmtMAD = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });

export function AccountRecommendationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["client-recommendations"],
    queryFn: clientApi.recommendations,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-terracotta" /> Pour vous
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            Sélection <span className="italic text-terracotta">personnalisée</span>
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Basée sur votre historique, les avis d'autres clients aux goûts proches, et le sentiment
            des avis récents.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-secondary/60" />
          ))}
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((d: Recommendation, i: number) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
            >
              <Link
                to={`/menu/${d.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  {d.image ? (
                    <img
                      src={d.image}
                      alt={d.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-5xl text-muted-foreground/40">
                      {d.name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{d.category}</span>
                    <span className="rounded-full bg-terracotta-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-terracotta">
                      {i === 0 ? "Top choix" : `Score ${d.score.toFixed(2)}`}
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-lg tracking-tight">{d.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
                  <div className="mt-auto pt-4 font-display text-lg tabular-nums tracking-tight">
                    {fmtMAD.format(Number(d.price))}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Nous n'avons pas encore assez d'informations pour vous proposer une sélection
          personnalisée. Passez votre première commande !
        </div>
      )}
    </div>
  );
}
