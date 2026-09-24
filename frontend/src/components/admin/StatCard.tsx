import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  delta?: number; // %
  icon?: React.ReactNode;
}

export function StatCard({ label, value, hint, delta, icon }: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-soft transition-all hover:shadow-glow">
      <div className="flex items-start justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        {icon && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-terracotta-soft text-terracotta">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-4 font-display text-3xl tracking-tight">{value}</div>
      {(hint || delta !== undefined) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                positive
                  ? "bg-[hsl(var(--olive)/0.15)] text-[hsl(var(--olive))]"
                  : "bg-destructive/15 text-destructive"
              )}
            >
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint}
        </div>
      )}
    </div>
  );
}
