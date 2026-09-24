import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { menuApi, type Dish } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DishFormDialog } from "./DishFormDialog";

const fmtMAD = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });

export function MenuPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Dish | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dishes"],
    queryFn: menuApi.listDishes,
  });

  const del = useMutation({
    mutationFn: (id: number) => menuApi.deleteDish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-dishes"] }),
  });

  const columns: Column<Dish>[] = [
    {
      key: "name",
      header: "Plat",
      render: (d) => (
        <div className="flex items-center gap-3">
          {d.image ? (
            <img src={d.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-xs text-muted-foreground">
              {d.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium">{d.name}</div>
            <div className="line-clamp-1 text-xs text-muted-foreground">{d.description}</div>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Catégorie", accessor: (d) => d.category_name ?? "—" },
    {
      key: "price",
      header: "Prix",
      className: "text-right",
      render: (d) => <span className="tabular-nums">{fmtMAD.format(Number(d.price))}</span>,
    },
    {
      key: "prep",
      header: "Temps",
      render: (d) => <span className="text-muted-foreground">{d.prep_time} min</span>,
    },
    {
      key: "status",
      header: "Statut",
      render: (d) =>
        d.is_available ? (
          <Badge variant="success">Disponible</Badge>
        ) : (
          <Badge variant="outline">Indisponible</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (d) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(d);
              setOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Supprimer « ${d.name} » ?`)) del.mutate(d.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Catalogue</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Menu</h2>
        </div>
        <Button
          variant="accent"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nouveau plat
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        loading={isLoading}
        searchKeys={["name", "category_name"]}
        rowKey={(d) => d.id}
      />

      <DishFormDialog
        open={open}
        onOpenChange={setOpen}
        dish={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-dishes"] })}
      />
    </div>
  );
}
