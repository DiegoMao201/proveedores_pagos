import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Tone = "red" | "yellow" | "orange" | "success" | "info";

interface KPICardProps {
  label: string;
  value: string;
  trend?: { direction: "up" | "down"; label: string };
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

const TONE_ICON_BG: Record<Tone, string> = {
  red: "bg-red/10 text-red-deep",
  yellow: "bg-yellow/20 text-graphite",
  orange: "bg-orange/15 text-orange",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

export function KPICard({ label, value, trend, tone = "red", icon: Icon, footer }: KPICardProps) {
  return (
    <Card className="relative overflow-hidden" style={{ paddingTop: 16 }}>
      <span className={cn("absolute inset-x-0 top-0 h-1", TONE_STRIPE[tone])} />
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-stone"
          style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {label}
        </p>
        {Icon && (
          <span className={cn("flex shrink-0 items-center justify-center rounded-full", TONE_ICON_BG[tone])} style={{ width: 24, height: 24 }}>
            <Icon size={12} />
          </span>
        )}
      </div>
      <p className="num text-ink" style={{ fontWeight: 800, fontSize: 21, lineHeight: 1.15, marginTop: 6 }}>
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "flex items-center gap-1",
            trend.direction === "up" ? "text-success" : "text-red-deep"
          )}
          style={{ fontSize: 10, fontWeight: 600, marginTop: 6 }}
        >
          {trend.direction === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trend.label}
        </p>
      )}
      {footer && <div style={{ marginTop: 8 }}>{footer}</div>}
    </Card>
  );
}
