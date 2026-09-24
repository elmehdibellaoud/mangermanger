import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { clientApi } from "@/api/public";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountProfilePage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["client-profile"], queryFn: clientApi.profile });
  const { data: loyalty } = useQuery({ queryKey: ["client-loyalty"], queryFn: clientApi.loyalty });
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", address: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data)
      setForm({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        address: data.address,
      });
  }, [data]);

  const update = useMutation({
    mutationFn: clientApi.updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Fidélité</p>
            <p className="mt-1 font-display text-3xl tracking-tight">
              {loyalty?.points ?? 0} <span className="text-base text-muted-foreground">points</span>
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            Total dépensé :<br />
            <span className="text-foreground font-medium">
              {Number(loyalty?.total_spent ?? 0).toFixed(2)} MAD
            </span>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate(form);
        }}
        className="space-y-5 rounded-2xl border border-border/70 bg-card p-6 shadow-soft"
      >
        <h2 className="font-display text-xl tracking-tight">Mes informations</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Prénom</Label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="mt-1.5"
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
          <Input value={data?.email ?? ""} disabled className="mt-1.5" />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Adresse</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="accent" disabled={update.isPending}>
            {update.isPending ? "Enregistrement…" : "Sauvegarder"}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-[hsl(var(--olive))]">
              <Check className="h-4 w-4" /> Enregistré
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
