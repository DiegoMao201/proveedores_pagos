import { Card } from "@/components/ui/card";
import type { SystemHealthRow } from "@/lib/dashboard-data";

const ESTADO_STYLE: Record<string, { bg: string; dot: string }> = {
  verde: { bg: "var(--color-success-soft)", dot: "var(--color-success)" },
  amarillo: { bg: "var(--color-cream)", dot: "var(--color-orange)" },
  rojo: { bg: "#FCEBEB", dot: "var(--color-red-deep)" },
};

function describe(row: SystemHealthRow): string {
  if (row.ultima_actividad == null || row.minutos_desde_ultima == null) return "⚠ Sin datos";
  const minutos = Math.round(row.minutos_desde_ultima);
  if (row.estado === "verde") return `Sincronizado hace ${minutos} min`;
  if (row.estado === "amarillo") return `Desactualizado hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  return `⚠ Sin sync hace ${horas}h`;
}

export function SystemHealthCard({ health }: { health: SystemHealthRow[] }) {
  const hayRojo = health.some((h) => h.estado === "rojo");

  return (
    <Card>
      <div style={{ marginBottom: 8 }}>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 14 }}>Salud del sistema</h2>
        <p className="text-stone" style={{ fontSize: 10 }}>Estado de sincronización con fuentes de datos</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {health.map((h) => {
          const style = ESTADO_STYLE[h.estado] ?? ESTADO_STYLE.rojo;
          return (
            <div key={h.componente} style={{ background: style.bg, borderRadius: 8, padding: "10px 12px" }}>
              <div className="flex items-center gap-1.5">
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: style.dot }} />
                <span className="text-ink" style={{ fontSize: 11, fontWeight: 700 }}>{h.nombre_display}</span>
              </div>
              <p className="text-stone" style={{ fontSize: 10, marginTop: 4 }}>{describe(h)}</p>
            </div>
          );
        })}
      </div>

      {hayRojo && (
        <p className="text-red-deep" style={{ fontSize: 10.5, marginTop: 8, fontWeight: 600 }}>
          ⚠ Datos posiblemente desactualizados. Verificar antes de armar lotes.
        </p>
      )}
    </Card>
  );
}
