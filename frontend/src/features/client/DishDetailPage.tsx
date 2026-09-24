import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Sparkles, Star } from "lucide-react";
import { motion } from "framer-motion";
import { publicApi, type Recommendation } from "@/api/public";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewForm } from "./ReviewForm";

const fmtMAD = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });

export function DishDetailPage() {
  const { id } = useParams();
  const user = useAuth((s) => s.user);
  const { data: dish, isLoading } = useQuery({
    queryKey: ["public-dish", id],
    queryFn: () => publicApi.dish(id!),
    enabled: !!id,
  });
  const { data: similar } = useQuery({
    queryKey: ["public-dish-similar", id],
    queryFn: () => publicApi.similarDishes(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="container py-20">Chargement…</div>;
  if (!dish) return null;

  return (
    <div className="container py-10">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/menu">
          <ArrowLeft className="h-4 w-4" /> Retour au menu
        </Link>
      </Button>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="aspect-[4/3] overflow-hidden rounded-2xl bg-secondary"
        >
          {dish.image ? (
            <img src={dish.image} alt={dish.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-8xl text-muted-foreground/30">
              {dish.name.slice(0, 1)}
            </div>
          )}
        </motion.div>

        <div className="flex flex-col justify-center">
          <Badge variant="accent" className="w-fit">{dish.category.name}</Badge>
          <h1 className="mt-4 font-display text-display-lg font-medium tracking-tight">
            {dish.name}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{dish.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <span className="font-display text-4xl tabular-nums tracking-tight">
              {fmtMAD.format(Number(dish.price))}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {dish.prep_time} min de préparation
            </span>
            {dish.rating_count > 0 && (
              <span className="flex items-center gap-1.5 text-sm">
                <Star className="h-4 w-4 fill-terracotta text-terracotta" />
                <span className="font-semibold">{dish.rating_average.toFixed(1)}</span>
                <span className="text-muted-foreground">({dish.rating_count} avis)</span>
              </span>
            )}
          </div>

          <div className="mt-10">
            <Button variant="accent" size="lg" asChild>
              <Link to="/reservation">Réserver une table</Link>
            </Button>
          </div>
        </div>
      </div>

      {similar && similar.length > 0 && (
        <section className="mt-20">
          <div className="mb-6">
            <p className="inline-flex items-center gap-1.5 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-terracotta" /> Recommandé
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-tight">Plats similaires</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.slice(0, 3).map((s: Recommendation, i: number) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link
                  to={`/menu/${s.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-secondary">
                    {s.image ? (
                      <img src={s.image} alt={s.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-5xl text-muted-foreground/40">
                        {s.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{s.category}</span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-terracotta">
                        {Math.round(s.score * 100)}% similaire
                      </span>
                    </div>
                    <h3 className="mt-1 font-display text-lg tracking-tight">{s.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                    <div className="mt-auto pt-4 font-display text-lg tabular-nums tracking-tight">
                      {fmtMAD.format(Number(s.price))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-20">
        <h2 className="font-display text-2xl tracking-tight">Ce qu'on en dit</h2>

        {user?.role === "CLIENT" && dish.can_review && (
          <div className="mt-6">
            <ReviewForm dishId={dish.id} dishName={dish.name} />
          </div>
        )}
        {user?.role === "CLIENT" && dish.already_reviewed && (
          <p className="mt-4 text-xs text-muted-foreground">
            Vous avez déjà laissé un avis sur ce plat. Merci !
          </p>
        )}

        {dish.reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucun avis pour ce plat. Soyez le premier à l'essayer !
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {dish.reviews.map((r) => (
              <article key={r.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{r.client}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={
                          i < (r.rating ?? 0)
                            ? "h-4 w-4 fill-terracotta text-terracotta"
                            : "h-4 w-4 text-border"
                        }
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{r.comment || "—"}</p>
                <p className="mt-3 text-xs text-muted-foreground/70">
                  {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
