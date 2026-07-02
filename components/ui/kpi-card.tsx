import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Tone = "red" | "yellow" | "orange" | "success" | "info";

interface KPICardProps {
  label: string;
  value: string;
  trend?: { direction: "up" | "down"; label: string };
  variant?: "default" | "critical" | "success";
  tone?: Tone;
  icon?: LucideIcon;
  footer?: ReactNode;
}

const TONE_STRIPE: Record<Tone, string> = {
  red: "bg-red",
  yellow: "bg-yellow",
  orange: "bg-orange",
  success: "bg-success",
  info: "bg-info",
};

const TONE_BADGE: Record<Tone, string> = {
  red: "bg-red/10 text-red-deep",
  yellow: "bg-yellow/20 text-graphite",
  orange: "bg-orange/15 text-orange",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

export function KPICard({ label, value, trend, variant = "default", tone = "red", icon: Icon, footer }: KPICardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden pt-7",
        variant === "critical" && "bg-cream border-red",
        variant === "success" && "border-l-4 border-l-success"
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1.5", TONE_STRIPE[tone])} />
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-stone">{label}</p>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", TONE_BADGE[tone])}>
            <Icon size={17} />
          </span>
        )}
      </div>
      <p className="num mt-3 text-4xl font-extrabold leading-none text-ink">{value}</p>
      {trend && (
        <p
          className={cn(
            "mt-3 flex items-center gap-1 text-sm font-semibold",
            trend.direction === "up" ? "text-success" : "text-red-deep"
          )}
        >
          {trend.direction === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {trend.label}
        </p>
      )}
      {footer && <div className="mt-4">{footer}</div>}
    </Card>
  );
}
