import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AgingBucketKey } from "@/components/ui/aging-swatch";

type BadgeStatus = AgingBucketKey | "pagada" | "excluida";

const CONFIG: Record<BadgeStatus, { label: string; className: string; icon?: "alert" | "check" }> = {
  al_dia: { label: "Al día", className: "bg-cream text-graphite" },
  "1_14": { label: "Por vencer", className: "bg-[#FEF4C0] border border-yellow text-graphite" },
  "15_30": { label: "Vence pronto", className: "bg-yellow/20 text-graphite" },
  "31_60": { label: "Vencida", className: "bg-orange/15 text-orange" },
  mas_60: { label: "Muy vencida", className: "bg-red-deep/12 text-red-deep", icon: "alert" },
  pagada: { label: "Pagada", className: "bg-[#EAEFEA] text-success", icon: "check" },
  excluida: { label: "Excluida", className: "bg-line text-stone line-through" },
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const config = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        config.className
      )}
    >
      {config.icon === "alert" && <AlertTriangle size={12} />}
      {config.icon === "check" && <Check size={12} />}
      {config.label}
    </span>
  );
}
