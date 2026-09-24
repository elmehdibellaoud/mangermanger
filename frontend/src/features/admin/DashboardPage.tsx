import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChefHat,
  MessageSquareText,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { dashboardApi } from "@/api/admin";
import { StatCard } from "@/components/admin/StatCard";

const fmtMAD = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
  maximumFractionDigits: 0,
});

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.stats,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Vue d'ensemble</p>
        <h2 className="mt-1 font-display text-3xl tracking-tight">
          Bonjour, <span className="italic text-terracotta">bienvenue.</span>
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenu 7 derniers jours"
          value={isLoading ? "—" : fmtMAD.format(Number(data?.revenue.last_7d ?? 0))}
          hint="Commandes payées"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Revenu 30 jours"
          value={isLoading ? "—" : fmtMAD.format(Number(data?.revenue.last_30d ?? 0))}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Commandes en cours"
          value={isLoading ? "—" : data?.orders.in_progress ?? 0}
          hint={`${data?.orders.paid ?? 0} payées / ${data?.orders.total ?? 0} total`}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <StatCard
          label="Plats au menu"
          value={isLoading ? "—" : data?.counts.dishes_available ?? 0}
          hint={`${data?.counts.dishes ?? 0} au total`}
          icon={<ChefHat className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl tracking-tight">Revenu quotidien</h3>
              <p className="text-xs text-muted-foreground">30 derniers jours</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.revenue_by_day ?? []}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                  formatter={(v: number) => [fmtMAD.format(Number(v)), "Revenu"]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--terracotta))"
                  strokeWidth={2.5}
                  dot={{ fill: "hsl(var(--terracotta))", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl tracking-tight">Top plats</h3>
              <p className="text-xs text-muted-foreground">Meilleures ventes</p>
            </div>
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.top_dishes ?? []} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--secondary))" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="sold" fill="hsl(var(--terracotta))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
