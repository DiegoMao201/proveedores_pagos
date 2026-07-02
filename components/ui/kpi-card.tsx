import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface KPICardProps {
  label: string;
  value: string;
  trend?: { direction: "up" | "down"; label: string };
  variant?: "default" | "critical" | "success";
  footer?: ReactNode;
}

export function KPICard({ label, value, trend, variant = "default", footer }: KPICardProps) {
  return (
    <Card
      className={cn(
        variant === "critical" && "bg-cream border-red",
        variant === "success" && "border-l-4 border-l-success"
      )}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-stone">{label}</p>
      <p className="num mt-2 text-3xl font-bold text-ink">{value}</p>
      {trend && (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-sm",
            trend.direction === "up" ? "text-success" : "text-red-deep"
          )}
        >
          {trend.direction === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {trend.label}
        </p>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </Card>
  );
}
