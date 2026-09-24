import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { clientApi } from "@/api/public";
import { Button } from "@/components/ui/button";

interface Props {
  dishId: number;
  dishName: string;
}

export function ReviewForm({ dishId, dishName }: Props) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: () => clientApi.createReview({ dish: dishId, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["public-dish", String(dishId)] });
      qc.invalidateQueries({ queryKey: ["client-my-reviews"] });
    },
  });

  if (submit.isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[hsl(var(--olive)/0.3)] bg-[hsl(var(--olive)/0.08)] p-6 text-sm"
      >
        <p className="font-medium text-[hsl(var(--olive))]">Merci pour votre avis !</p>
        <p className="mt-1 text-muted-foreground">
          Il apparaîtra publiquement une fois validé par l'équipe.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
      className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft"
    >
      <h3 className="font-display text-xl tracking-tight">Laissez votre avis</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Vous avez commandé <span className="font-medium text-foreground">{dishName}</span> — partagez votre impression.
      </p>



      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        placeholder="Qu'avez-vous aimé ou pas ? Votre avis aide à améliorer le service."
        className="mt-4 w-full rounded-lg border border-input bg-background/60 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {submit.isError && (
        <p className="mt-3 text-sm text-destructive">
          {(submit.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            "Erreur lors de l'envoi."}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          L'analyse de sentiment sera effectuée automatiquement.
        </p>
        <Button type="submit" variant="accent" disabled={submit.isPending}>
          <Send className="h-4 w-4" />
          {submit.isPending ? "Envoi…" : "Publier l'avis"}
        </Button>
      </div>
    </form>
  );
}
