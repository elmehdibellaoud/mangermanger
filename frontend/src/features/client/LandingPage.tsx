import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { publicApi, type PublicDish } from "@/api/public";

const fmtMAD = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });

export function LandingPage() {
  return (
    <>
      <Hero />
      <Pillars />
      <PopularDishes />
      <Cta />
    </>
  );
}

function Hero() {
  return (
    <section className="container relative pb-24 pt-10 md:pt-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-3xl text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-terracotta" />
          Une table qui vous connaît, une cuisine qui vous surprend
        </span>
        <h1 className="mt-6 font-display text-display-xl font-medium text-foreground">
          Cuisiné <span className="italic text-terracotta">avec soin</span>.
          <br />
          Servi avec le sourire.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Produits de saison, recettes maison, et une équipe qui prend le temps. Réservez en 3 clics,
          découvrez nos plats, et laissez-vous guider par les recommandations de notre IA.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="accent" size="lg" asChild>
            <Link to="/reservation">
              Réserver une table
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/menu">Voir la carte</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

function Pillars() {
  const items = [
    { title: "Saisonnier", body: "Une carte qui change avec les arrivages du marché — ce qui est bon aujourd'hui." },
    { title: "Fait maison", body: "Pain, pâtes, sauces. Tout est préparé sur place, chaque jour." },
    { title: "Guidé par l'IA", body: "Nos recommandations apprennent de vos goûts. Sans jamais imposer." },
  ];
  return (
    <section className="container pb-24">
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <Card className="h-full">
              <CardContent className="pt-6">
                <div className="mb-6 inline-flex h-8 w-8 items-center justify-center rounded-full bg-terracotta-soft text-terracotta text-sm font-medium">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-display text-2xl leading-tight tracking-tight">{it.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{it.body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function PopularDishes() {
  const { data: categories } = useQuery({ queryKey: ["public-menu"], queryFn: publicApi.menu });
  const popular: PublicDish[] = (categories ?? []).flatMap((c) => c.dishes).slice(0, 6);
  if (popular.length === 0) return null;

  return (
    <section className="container pb-24">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Au menu</p>
          <h2 className="mt-3 font-display text-display-lg font-medium">
            Quelques <span className="italic text-terracotta">incontournables</span>
          </h2>
        </div>
        <Button variant="ghost" asChild className="hidden md:inline-flex">
          <Link to="/menu">
            Voir toute la carte <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {popular.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
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
                <h3 className="font-display text-xl tracking-tight">{d.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
                <div className="mt-auto flex items-end justify-between pt-5">
                  <span className="font-display text-xl tabular-nums tracking-tight">
                    {fmtMAD.format(Number(d.price))}
                  </span>
                  <span className="text-xs text-muted-foreground">{d.prep_time} min</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="container pb-24">
      <div className="overflow-hidden rounded-[2rem] bg-ink px-8 py-16 text-bone md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-xl text-center"
        >
          <h2 className="font-display text-display-lg font-medium">
            Une table, <span className="italic text-terracotta">votre soirée</span>.
          </h2>
          <p className="mt-4 text-bone/70">
            Prévenez-nous de vos allergies, d'une occasion, ou d'une préférence — on s'en souvient
            pour la prochaine fois.
          </p>
          <Button variant="accent" size="lg" asChild className="mt-8">
            <Link to="/reservation">
              Réserver maintenant <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
