import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Brain, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sentimentApi, type SentimentPrediction } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const EXAMPLES = [
  "J'ai adoré ce plat, vraiment savoureux et parfaitement cuit.",
  "Service catastrophique, le plat est arrivé froid et totalement fade.",
  "Plat correct, sans plus. Le service était rapide.",
  "I loved it — amazing and delicious!",
  "لذيذ جدا، شكرا",
];

export function SentimentPlaygroundPage() {
  const [text, setText] = useState(EXAMPLES[0]);
  const [history, setHistory] = useState<{ text: string; result: SentimentPrediction }[]>([]);

  const predict = useMutation({
    mutationFn: (t: string) => sentimentApi.predict(t),
    onSuccess: (result, variables) => {
      setHistory((h) => [{ text: variables, result }, ...h].slice(0, 6));
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-soft text-terracotta">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Démo IA</p>
          <h2 className="mt-0.5 font-display text-3xl tracking-tight">
            Analyse de <span className="italic text-terracotta">sentiment</span>
          </h2>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
        <label htmlFor="text" className="text-sm font-medium">
          Texte à analyser
        </label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-2 w-full rounded-lg border border-input bg-background/60 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Saisissez un avis client (FR/EN/AR)…"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-terracotta/40 hover:text-foreground"
            >
              {ex.slice(0, 40)}…
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Backend : analyse lexicale (FR/EN/AR). Activez{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
              SENTIMENT_MODEL_ENABLED
            </code>{" "}
            pour le modèle HuggingFace.
          </p>
          <Button
            variant="accent"
            onClick={() => predict.mutate(text)}
            disabled={!text.trim() || predict.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {predict.isPending ? "Analyse…" : "Analyser"}
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {predict.data && (
            <motion.div
              key={predict.data.sentiment + history.length}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 rounded-xl border border-border bg-background p-5"
            >
              <ResultBadge result={predict.data} />
              <Meter score={predict.data.score} sentiment={predict.data.sentiment} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {history.length > 1 && (
        <div className="space-y-3">
          <h3 className="font-display text-xl tracking-tight">Analyses précédentes</h3>
          <div className="space-y-2">
            {history.slice(1).map((h, i) => (
              <article
                key={i}
                className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-soft"
              >
                <div className="flex-1 min-w-0 text-sm text-muted-foreground">
                  <p className="line-clamp-2 text-foreground">{h.text}</p>
                </div>
                <ResultBadge result={h.result} compact />
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultBadge({ result, compact = false }: { result: SentimentPrediction; compact?: boolean }) {
  const variant =
    result.sentiment === "POSITIVE" ? "success" : result.sentiment === "NEGATIVE" ? "danger" : "default";
  const Icon =
    result.sentiment === "POSITIVE" ? ThumbsUp : result.sentiment === "NEGATIVE" ? ThumbsDown : null;
  const label = { POSITIVE: "Positif", NEUTRAL: "Neutre", NEGATIVE: "Négatif" }[result.sentiment];
  if (compact) {
    return (
      <Badge variant={variant}>
        {Icon && <Icon className="h-3 w-3" />}
        {label} {Math.round(result.score * 100)}%
      </Badge>
    );
  }
  return (
    <div className="flex items-center justify-between gap-4">
      <Badge variant={variant} className="px-3 py-1 text-sm">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </Badge>
      <div className="text-right">
        <div className="text-3xl font-display tabular-nums tracking-tight">
          {Math.round(result.score * 100)}%
        </div>
        <div className="text-xs text-muted-foreground">de confiance</div>
      </div>
    </div>
  );
}

function Meter({ score, sentiment }: { score: number; sentiment: string }) {
  const color =
    sentiment === "POSITIVE"
      ? "bg-[hsl(var(--olive))]"
      : sentiment === "NEGATIVE"
        ? "bg-destructive"
        : "bg-muted-foreground";
  return (
    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score * 100}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}
