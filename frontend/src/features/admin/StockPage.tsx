import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
import { stockApi, menuApi, type StockItem } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StockPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-stock"],
    queryFn: stockApi.list,
  });
  const lowCount = (items ?? []).filter((i) => i.is_low).length;

  const columns: Column<StockItem>[] = [
    {
      key: "name",
      header: "Ingrédient",
      render: (i) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{i.ingredient_name}</span>
          {i.is_low && <Badge variant="danger">Stock bas</Badge>}
        </div>
      ),
    },
    {
      key: "qty",
      header: "Quantité",
      render: (i) => (
        <span className="tabular-nums">
          {Number(i.quantity).toFixed(2)} {i.unit}
        </span>
      ),
    },
    {
      key: "th",
      header: "Seuil",
      render: (i) => (
        <span className="tabular-nums text-muted-foreground">
          {Number(i.threshold_low).toFixed(2)} {i.unit}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Mis à jour",
      render: (i) => (
        <span className="text-xs text-muted-foreground">
          {new Date(i.updated_at).toLocaleString("fr-FR")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {lowCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">
            {lowCount} ingrédient{lowCount > 1 ? "s" : ""} sous le seuil de réapprovisionnement.
          </span>
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Inventaire</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Stock</h2>
        </div>
        <Button variant="accent" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Entrée de marchandise
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items ?? []}
        loading={isLoading}
        searchKeys={["ingredient_name"]}
        rowKey={(i) => i.id}
      />

      <MovementDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-stock"] })}
      />
    </div>
  );
}

function MovementDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { data: ingredients } = useQuery({
    queryKey: ["admin-ingredients"],
    queryFn: menuApi.listIngredients,
  });
  const [ingredient, setIngredient] = useState<number | "">("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const add = useMutation({
    mutationFn: stockApi.addMovement,
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
      setQuantity("");
      setReason("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mouvement de stock</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!ingredient) return;
            add.mutate({ ingredient: Number(ingredient), type, quantity, reason });
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="ing">Ingrédient</Label>
            <select
              id="ing"
              value={ingredient}
              onChange={(e) => setIngredient(Number(e.target.value))}
              required
              className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="">—</option>
              {ingredients?.results.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as "IN" | "OUT" | "ADJUST")}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="IN">Entrée</option>
                <option value="OUT">Sortie</option>
                <option value="ADJUST">Ajustement</option>
              </select>
            </div>
            <div>
              <Label htmlFor="qty">Quantité</Label>
              <Input
                id="qty"
                type="number"
                step="0.001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Motif (optionnel)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="accent" disabled={add.isPending}>
              {add.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
