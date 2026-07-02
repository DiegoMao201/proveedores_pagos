import { cn } from "@/lib/cn";

export function BankStatusBadge({ activo, tieneCuentaActiva }: { activo: boolean; tieneCuentaActiva: boolean }) {
  if (!activo) {
    return (
      <span className="inline-flex items-center rounded-full bg-line px-2.5 py-0.5 font-semibold text-stone" style={{ fontSize: 10 }}>
        Inactivo
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold",
        tieneCuentaActiva ? "bg-success/10 text-success" : "bg-yellow/20 text-graphite"
      )}
      style={{ fontSize: 10 }}
    >
      {tieneCuentaActiva ? "Pagable" : "Sin cuenta"}
    </span>
  );
}
