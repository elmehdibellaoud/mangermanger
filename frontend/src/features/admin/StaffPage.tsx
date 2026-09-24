import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { staffApi, type Employee } from "@/api/admin";
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

const ROLE_LABEL: Record<string, string> = {
  SERVEUR: "Serveur",
  CUISINIER: "Cuisinier",
  GERANT: "Gérant",
};

export function StaffPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["admin-staff"], queryFn: staffApi.list });

  const columns: Column<Employee>[] = [
    {
      key: "person",
      header: "Employé",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta-soft text-sm font-semibold text-terracotta">
            {(u.first_name?.[0] ?? u.email[0]).toUpperCase()}
          </div>
          <div>
            <div className="font-medium">
              {u.first_name} {u.last_name}
            </div>
            <div className="text-xs text-muted-foreground">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rôle",
      render: (u) => <Badge variant="accent">{ROLE_LABEL[u.role] ?? u.role}</Badge>,
    },
    {
      key: "status",
      header: "Statut",
      render: (u) =>
        u.is_active ? (
          <Badge variant="success">Actif</Badge>
        ) : (
          <Badge variant="outline">Désactivé</Badge>
        ),
    },
    {
      key: "since",
      header: "Depuis",
      render: (u) => (
        <span className="text-xs text-muted-foreground">
          {new Date(u.date_joined).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Gestion RH</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Équipe</h2>
        </div>
        <Button variant="accent" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvel employé
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        loading={isLoading}
        searchKeys={["first_name", "last_name", "email"]}
        rowKey={(u) => u.id}
      />

      <NewEmployeeDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-staff"] })}
      />
    </div>
  );
}

function NewEmployeeDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "SERVEUR" as Employee["role"],
    password: "",
  });

  const create = useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
      setForm({ email: "", first_name: "", last_name: "", role: "SERVEUR", password: "" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel employé</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prénom</Label>
              <Input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label>Nom</Label>
              <Input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1.5"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rôle</Label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Employee["role"] })}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="SERVEUR">Serveur</option>
                <option value="CUISINIER">Cuisinier</option>
                <option value="GERANT">Gérant</option>
              </select>
            </div>
            <div>
              <Label>Mot de passe initial</Label>
              <Input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1.5"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="accent" disabled={create.isPending}>
              {create.isPending ? "Création…" : "Créer l'employé"}
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
