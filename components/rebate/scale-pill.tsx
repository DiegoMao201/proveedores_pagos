import { cn } from "@/lib/cn";

const CONFIG: Record<string, { label: string; className: string }> = {
  SIN_ESCALA: { label: "Sin escala", className: "bg-line text-stone" },
  ESCALA_1: { label: "Escala 1", className: "bg-yellow/20 text-graphite" },
  ESCALA_2: { label: "Escala 2", className: "bg-success/10 text-success" },
  ESCALA_20: { label: "Escala 20%", className: "bg-yellow/20 text-graphite" },
  ESCALA_30: { label: "Escala 30%", className: "bg-orange/15 text-orange" },
  ESCALA_40: { label: "Escala 40%", className: "bg-success/10 text-success" },
  ESCALA_50: { label: "Escala 50%", className: "bg-success/20 text-success" },
  FUTURO: { label: "Futuro", className: "bg-line text-stone" },
  ABIERTO: { label: "En curso", className: "bg-info/10 text-info" },
  CUMPLIDO: { label: "Cumplido", className: "bg-success/10 text-success" },
  NO_CUMPLIDO: { label: "No cumplido", className: "bg-red/10 text-red-deep" },
  CARTERA_RIESGO: { label: "Cartera pendiente", className: "bg-orange/15 text-orange" },
};

export function ScalePill({ value }: { value: string }) {
  const config = CONFIG[value] ?? { label: value, className: "bg-line text-stone" };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold", config.className)}
      style={{ fontSize: 10 }}
    >
      {config.label}
    </span>
  );
}
