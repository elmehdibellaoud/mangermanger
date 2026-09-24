import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { jobsApi, type JobApplication, type JobOffer } from "@/api/admin";
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

export function JobsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"offers" | "apps">("offers");
  const [open, setOpen] = useState(false);

  const { data: offers, isLoading: lo } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: jobsApi.listOffers,
  });
  const { data: apps, isLoading: la } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: jobsApi.listApplications,
  });

  const offerColumns: Column<JobOffer>[] = [
    { key: "title", header: "Poste", render: (o) => <span className="font-medium">{o.title}</span> },
    {
      key: "apps",
      header: "Candidatures",
      render: (o) => <span className="tabular-nums">{o.applications_count}</span>,
    },
    {
      key: "status",
      header: "Statut",
      render: (o) =>
        o.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Fermée</Badge>,
    },
    {
      key: "date",
      header: "Publiée",
      render: (o) => (
        <span className="text-xs text-muted-foreground">
          {new Date(o.created_at).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
  ];

  const appColumns: Column<JobApplication>[] = [
    {
      key: "person",
      header: "Candidat",
      render: (a) => (
        <div>
          <div className="font-medium">{a.candidate_name}</div>
          <div className="text-xs text-muted-foreground">{a.email}</div>
        </div>
      ),
    },
    { key: "offer", header: "Poste", accessor: (a) => a.offer_title },
    {
      key: "status",
      header: "Statut",
      render: (a) => (
        <Badge
          variant={
            a.status === "HIRED" ? "success" : a.status === "REJECTED" ? "danger" : "default"
          }
        >
          {
            { NEW: "Nouvelle", REVIEWED: "Examinée", REJECTED: "Rejetée", HIRED: "Embauchée" }[
              a.status
            ]
          }
        </Badge>
      ),
    },
    {
      key: "cv",
      header: "CV",
      render: (a) => (
        <a
          href={a.cv}
          target="_blank"
          rel="noreferrer"
          className="text-terracotta underline-offset-4 hover:underline"
        >
          Télécharger
        </a>
      ),
    },
    {
      key: "date",
      header: "Reçue",
      render: (a) => (
        <span className="text-xs text-muted-foreground">
          {new Date(a.created_at).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Recrutement</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Offres & candidatures</h2>
        </div>
        {tab === "offers" && (
          <Button variant="accent" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nouvelle offre
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border/70">
        <TabButton active={tab === "offers"} onClick={() => setTab("offers")}>
          Offres ({offers?.count ?? 0})
        </TabButton>
        <TabButton active={tab === "apps"} onClick={() => setTab("apps")}>
          Candidatures ({apps?.count ?? 0})
        </TabButton>
      </div>

      {tab === "offers" ? (
        <DataTable
          columns={offerColumns}
          data={offers?.results ?? []}
          loading={lo}
          searchKeys={["title"]}
          rowKey={(o) => o.id}
        />
      ) : (
        <DataTable
          columns={appColumns}
          data={apps?.results ?? []}
          loading={la}
          searchKeys={["candidate_name", "email", "offer_title"]}
          rowKey={(a) => a.id}
        />
      )}

      <OfferDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-offers"] })}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-terracotta" />}
    </button>
  );
}

function OfferDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ title: "", description: "", requirements: "", is_active: true });
  const create = useMutation({
    mutationFn: jobsApi.createOffer,
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
      setForm({ title: "", description: "", requirements: "", is_active: true });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle offre</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form);
          }}
          className="space-y-4"
        >
          <div>
            <Label>Intitulé</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <Label>Exigences</Label>
            <textarea
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              rows={3}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="accent" disabled={create.isPending}>
              Publier
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
