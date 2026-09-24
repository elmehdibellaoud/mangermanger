import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Check, MapPin, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { reservationsApi, type AdminReservation } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { ReservationFormDialog } from "./ReservationFormDialog";

type Filter = "" | "PENDING" | "CONFIRMED" | "CANCELLED" | "SEATED";

const STATUS_BADGE: Record<
  string,
  { variant: "default" | "accent" | "success" | "danger" | "outline"; label: string }
> = {
  PENDING: { variant: "accent", label: "En attente" },
  CONFIRMED: { variant: "success", label: "Confirmée" },
  SEATED: { variant: "default", label: "Installée" },
  CANCELLED: { variant: "danger", label: "Annulée" },
};

export function ReservationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminReservation | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reservations", filter],
    queryFn: () => reservationsApi.list(filter ? { status: filter } : undefined),
  });

  const confirm = useMutation({
    mutationFn: reservationsApi.confirm,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reservations"] }),
  });
  const cancel = useMutation({
    mutationFn: reservationsApi.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reservations"] }),
  });
  const seat = useMutation({
    mutationFn: reservationsApi.seat,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reservations"] }),
  });
  const del = useMutation({
    mutationFn: reservationsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reservations"] }),
  });

  const counts = (status: Filter) =>
    (data?.results ?? []).filter((r) => !status || r.status === status).length;

  const columns: Column<AdminReservation>[] = [
    {
      key: "when",
      header: "Date & heure",
      render: (r) => (
        <div>
          <div className="font-medium">
            {new Date(r.date).toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </div>
          <div className="text-xs text-muted-foreground">{r.time.slice(0, 5)}</div>
        </div>
      ),
    },
    {
      key: "guest",
      header: "Invité",
      render: (r) => (
        <div>
          <div className="font-medium">{r.guest_name || "(client connecté)"}</div>
          <div className="text-xs text-muted-foreground">{r.guest_email}</div>
        </div>
      ),
    },
    {
      key: "guests",
      header: "Personnes",
      render: (r) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {r.guests}
        </span>
      ),
    },
    {
      key: "table",
      header: "Table",
      render: (r) =>
        r.table_number ? (
          <span className="inline-flex items-center gap-1 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            Table {r.table_number}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Statut",
      render: (r) => {
        const b = STATUS_BADGE[r.status];
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.status === "PENDING" && (
            <Button
              size="sm"
              variant="accent"
              onClick={(e) => {
                e.stopPropagation();
                confirm.mutate(r.id);
              }}
            >
              <Check className="h-3.5 w-3.5" />
              Confirmer
            </Button>
          )}
          {r.status === "CONFIRMED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                seat.mutate(r.id);
              }}
            >
              Installer
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(r);
              setDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {r.status !== "CANCELLED" && r.status !== "SEATED" && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Annuler la réservation de ${r.guest_name || "ce client"} ?`)) {
                  cancel.mutate(r.id);
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Supprimer définitivement cette réservation ?")) {
                del.mutate(r.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Salle</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Réservations</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarCheck2 className="h-4 w-4 text-terracotta" />
            {counts("") - counts("CANCELLED")} actives
          </div>
          <Button
            variant="accent"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nouvelle réservation
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["", "PENDING", "CONFIRMED", "SEATED", "CANCELLED"] as Filter[]).map((f) => (
          <button
            key={f || "all"}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-terracotta text-accent-foreground shadow-glow"
                : "border border-border bg-card hover:bg-secondary"
            }`}
          >
            {f === ""
              ? "Toutes"
              : { PENDING: "En attente", CONFIRMED: "Confirmées", SEATED: "Installées", CANCELLED: "Annulées" }[f]}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        loading={isLoading}
        searchKeys={["guest_name", "guest_email"]}
        rowKey={(r) => r.id}
      />

      <ReservationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existing={editing}
      />
    </div>
  );
}
