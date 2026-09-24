import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { publicApi, type PublicDish } from "@/api/public";
import { cn } from "@/lib/utils";

const fmtMAD = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });

export function MenuPage() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["public-menu"],
    queryFn: publicApi.menu,
  });
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const visibleCategories = useMemo(() => {
    if (!categories) return [];
    const base = activeSlug ? categories.filter((c) => c.slug === activeSlug) : categories;
    if (!query) return base;
    const q = query.toLowerCase();
    return base
      .map((c) => ({ ...c, dishes: c.dishes.filter((d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)) }))
      .filter((c) => c.dishes.length);
  }, [categories, activeSlug, query]);

  return (
    <div className="container py-12">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Notre carte</p>
        <h1 className="mt-4 font-display text-display-lg font-medium">
          La cuisine <span className="italic text-terracotta">du moment</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Produits frais, recettes maison, et une sélection qui change avec les saisons.
        </p>
      </motion.header>

      <div className="mt-10 flex flex-col items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un plat, un ingrédient…"
            className="h-12 w-full rounded-full border border-input bg-card pl-10 pr-4 text-sm outline-none transition-all focus:border-terracotta/50 focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveSlug(null)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
              activeSlug === null
                ? "border-transparent bg-terracotta text-accent-foreground shadow-glow"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            Toute la carte
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveSlug(c.slug)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                activeSlug === c.slug
                  ? "border-transparent bg-terracotta text-accent-foreground shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-14 space-y-16">
        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        {!isLoading && visibleCategories.length === 0 && (
          <p className="py-20 text-center text-muted-foreground">Aucun plat ne correspond.</p>
        )}
        {visibleCategories.map((c, ci) => (
          <section key={c.id}>
            <div className="mb-6 flex items-end justify-between border-b border-border/70 pb-3">
              <h2 className="font-display text-3xl tracking-tight">{c.name}</h2>
              <span className="text-xs text-muted-foreground">{c.dishes.length} plats</span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {c.dishes.map((d, di) => (
                <DishCard key={d.id} dish={d} delay={ci * 0.05 + di * 0.03} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function DishCard({ dish, delay }: { dish: PublicDish; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/menu/${dish.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
      >
        <div className="aspect-[4/3] overflow-hidden bg-secondary">
          {dish.image ? (
            <img
              src={dish.image}
              alt={dish.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-5xl text-muted-foreground/40">
              {dish.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-xl tracking-tight">{dish.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{dish.description}</p>
          <div className="mt-auto flex items-end justify-between pt-5">
            <span className="font-display text-xl tabular-nums tracking-tight">
              {fmtMAD.format(Number(dish.price))}
            </span>
            <span className="text-xs text-muted-foreground">{dish.prep_time} min</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
