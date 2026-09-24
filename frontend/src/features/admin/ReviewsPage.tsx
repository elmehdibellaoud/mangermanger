import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ThumbsDown, ThumbsUp, X, Star } from "lucide-react";
import { reviewsApi, type Review } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/DataTable";

type Filter = "" | "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export function ReviewsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: () => reviewsApi.list(filter || undefined),
  });

  const approve = useMutation({
    mutationFn: reviewsApi.approve,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });
  const reject = useMutation({
    mutationFn: reviewsApi.reject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  const columns: Column<Review>[] = [
    {
      key: "dish",
      header: "Plat",
      render: (r) => (
        <div>
          <div className="font-medium">{r.dish_name}</div>
          <div className="text-xs text-muted-foreground">{r.client_email}</div>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Note",
      render: (r) => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < r.rating ? "fill-terracotta text-terracotta" : "text-border"
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      key: "sentiment",
      header: "Sentiment",
      render: (r) =>
        r.sentiment ? <SentimentBadge sentiment={r.sentiment} score={r.sentiment_score} /> : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "comment",
      header: "Commentaire",
      render: (r) => (
        <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">{r.comment || "—"}</p>
      ),
    },
    {
      key: "status",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.is_approved ? (
            <Badge variant="success">Approuvé</Badge>
          ) : (
            <Badge variant="outline">Modéré</Badge>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => (r.is_approved ? reject.mutate(r.id) : approve.mutate(r.id))}
          >
            {r.is_approved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Modération</p>
        <h2 className="mt-1 font-display text-3xl tracking-tight">Avis clients</h2>
      </div>

      <SentimentMiniDash />

      <div className="flex flex-wrap gap-2">
        {(["", "POSITIVE", "NEUTRAL", "NEGATIVE"] as Filter[]).map((f) => (
          <button
            key={f || "all"}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-terracotta text-accent-foreground"
                : "border border-border bg-card hover:bg-secondary"
            }`}
          >
            {f ? { POSITIVE: "Positifs", NEUTRAL: "Neutres", NEGATIVE: "Négatifs" }[f] : "Tous"}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        loading={isLoading}
        searchKeys={["dish_name", "client_email", "comment"]}
        rowKey={(r) => r.id}
      />
    </div>
  );
}

function SentimentBadge({
  sentiment,
  score,
}: {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  score: number | null;
}) {
  const variant =
    sentiment === "POSITIVE" ? "success" : sentiment === "NEGATIVE" ? "danger" : "default";
  const icon =
    sentiment === "POSITIVE" ? (
      <ThumbsUp className="h-3 w-3" />
    ) : sentiment === "NEGATIVE" ? (
      <ThumbsDown className="h-3 w-3" />
    ) : null;
  return (
    <Badge variant={variant}>
      {icon}
      {{ POSITIVE: "Positif", NEUTRAL: "Neutre", NEGATIVE: "Négatif" }[sentiment]}
      {score != null && <span className="ml-1 opacity-70">{Math.round(score * 100)}%</span>}
    </Badge>
  );
}

function SentimentMiniDash() {
  const { data } = useQuery({
    queryKey: ["sentiment-stats"],
    queryFn: reviewsApi.sentimentStats,
  });
  if (!data) return null;
  const { totals } = data as { totals: { positive: number; neutral: number; negative: number } };
  const total = totals.positive + totals.neutral + totals.negative;
  if (!total) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-6 text-sm text-muted-foreground">
        Aucune analyse de sentiment disponible. Les avis seront analysés dès la mise en service (Phase 5.A).
      </div>
    );
  }
  const pct = (v: number) => Math.round((v / total) * 100);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MiniStat label="Positifs" value={`${totals.positive} (${pct(totals.positive)}%)`} color="olive" />
      <MiniStat label="Neutres" value={`${totals.neutral} (${pct(totals.neutral)}%)`} color="muted" />
      <MiniStat label="Négatifs" value={`${totals.negative} (${pct(totals.negative)}%)`} color="destructive" />
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  const bg =
    color === "olive"
      ? "bg-[hsl(var(--olive)/0.12)]"
      : color === "destructive"
        ? "bg-destructive/10"
        : "bg-secondary";
  return (
    <div className={`rounded-xl border border-border/70 p-5 ${bg}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl tracking-tight">{value}</div>
    </div>
  );
}
