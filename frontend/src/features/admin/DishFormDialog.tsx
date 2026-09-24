import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { menuApi, type Dish } from "@/api/admin";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dish: Dish | null;
  onSaved: () => void;
}

interface SelectedIngredient {
  ingredientId: number;
  quantity: string;
}

export function DishFormDialog({ open, onOpenChange, dish, onSaved }: Props) {
  const { data: cats } = useQuery({ queryKey: ["admin-categories"], queryFn: menuApi.listCategories });
  const { data: allIngs } = useQuery({ queryKey: ["admin-ingredients"], queryFn: menuApi.listIngredients });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<number | "">("");
  const [prepTime, setPrepTime] = useState(15);
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ingredientsList, setIngredientsList] = useState<SelectedIngredient[]>([]);
  const [selectedIngId, setSelectedIngId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(dish?.name ?? "");
      setDescription(dish?.description ?? "");
      setPrice(dish?.price ?? "");
      setCategory(dish?.category ?? "");
      setPrepTime(dish?.prep_time ?? 15);
      setIsAvailable(dish?.is_available ?? true);
      setImageFile(null);
      setIngredientsList(
        dish?.dish_ingredients?.map((di) => ({
          ingredientId: di.ingredient,
          quantity: String(di.quantity),
        })) ?? []
      );
      setSelectedIngId("");
    }
  }, [open, dish]);

  function addIngredient() {
    if (!selectedIngId) return;
    if (ingredientsList.some((i) => i.ingredientId === selectedIngId)) return;
    setIngredientsList([...ingredientsList, { ingredientId: selectedIngId, quantity: "0.100" }]);
    setSelectedIngId("");
  }

  function updateQuantity(index: number, quantity: string) {
    const next = [...ingredientsList];
    next[index].quantity = quantity;
    setIngredientsList(next);
  }

  function removeIngredient(index: number) {
    setIngredientsList(ingredientsList.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("name", name);
    fd.append("description", description);
    fd.append("price", price);
    fd.append("category", String(category));
    fd.append("prep_time", String(prepTime));
    fd.append("is_available", String(isAvailable));
    if (imageFile) fd.append("image", imageFile);

    // Map fields back to match backend's DishIngredientSerializer expects:
    // ingredient (primary key related field) and quantity
    const payload = ingredientsList.map((i) => ({
      ingredient: i.ingredientId,
      quantity: i.quantity,
    }));
    fd.append("dish_ingredients", JSON.stringify(payload));

    try {
      if (dish) await menuApi.updateDish(dish.id, fd);
      else await menuApi.createDish(fd);
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  // Filter out already added ingredients from the dropdown selector
  const availableIngs = allIngs?.results.filter(
    (ing) => !ingredientsList.some((added) => added.ingredientId === ing.id)
  ) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dish ? "Modifier le plat" : "Nouveau plat"}</DialogTitle>
          <DialogDescription>
            Renseignez les informations visibles par vos clients.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">Prix (MAD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="prep">Durée (min)</Label>
              <Input
                id="prep"
                type="number"
                min="1"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="cat">Catégorie</Label>
              <select
                id="cat"
                value={category}
                onChange={(e) => setCategory(Number(e.target.value))}
                required
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">—</option>
                {cats?.results.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-border/60 pt-4">
            <h3 className="text-sm font-semibold mb-2">Ingrédients requis</h3>
            
            <div className="flex gap-2 mb-3">
              <select
                value={selectedIngId}
                onChange={(e) => setSelectedIngId(e.target.value ? Number(e.target.value) : "")}
                className="h-10 flex-1 rounded-md border border-input bg-card px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Sélectionner un ingrédient…</option>
                {availableIngs.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit})
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient} disabled={!selectedIngId}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>

            {ingredientsList.length === 0 ? (
              <div className="text-xs text-muted-foreground border border-dashed border-border/80 rounded-lg p-3 text-center">
                Aucun ingrédient associé. Le stock ne sera pas déduit lors de la commande.
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {ingredientsList.map((added, index) => {
                  const ingInfo = allIngs?.results.find((ing) => ing.id === added.ingredientId);
                  return (
                    <div key={added.ingredientId} className="flex items-center gap-3 bg-secondary/35 rounded-lg p-2 text-xs">
                      <span className="flex-1 font-medium truncate">
                        {ingInfo?.name ?? `Ingrédient #${added.ingredientId}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={added.quantity}
                          onChange={(e) => updateQuantity(index, e.target.value)}
                          className="h-8 w-24 text-center px-1"
                        />
                        <span className="text-muted-foreground w-8">{ingInfo?.unit ?? ""}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeIngredient(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border/60 pt-4">
            <Label htmlFor="img">Image</Label>
            <Input
              id="img"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="mt-1.5"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="avail"
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-terracotta"
            />
            <Label htmlFor="avail" className="cursor-pointer">
              Disponible à la carte
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? "Enregistrement…" : dish ? "Mettre à jour" : "Créer"}
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
