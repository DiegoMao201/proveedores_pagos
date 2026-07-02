import type { ProviderConcentrationRow } from "@/lib/cartera-portfolio-data";
import { formatCompact } from "@/lib/format";

const BAR_COLORS = ["var(--color-red)", "var(--color-orange)", "var(--color-yellow)"];

export function ConcentrationBars({ rows, totalProviders }: { rows: ProviderConcentrationRow[]; totalProviders: number }) {
  const max = rows[0]?.total_pendiente ?? 1;
  const shown = rows.slice(0, 5);
  const restPct = rows.slice(5).reduce((sum, r) => sum + r.pct_portafolio, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 13 }}>
          Concentración por proveedor
        </h2>
        <span className="text-stone" style={{ fontSize: 10 }}>
          Top 10 · % del pendiente
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {shown.map((row, i) => (
          <div key={row.nombre_display}>
            <div className="flex items-baseline justify-between">
              <p className="text-ink" style={{ fontWeight: 700, fontSize: 12 }}>
                {row.nombre_display}
              </p>
              <span className="num text-ink" style={{ fontWeight: 800, fontSize: 12 }}>
                {row.pct_portafolio}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max((row.total_pendiente / max) * 100, 2)}%`,
                  backgroundColor: BAR_COLORS[i] ?? "var(--color-line)",
                }}
              />
            </div>
            <p className="text-stone" style={{ fontSize: 10, marginTop: 2 }}>
              {formatCompact(row.total_pendiente)} · {row.facturas} facturas
            </p>
          </div>
        ))}
      </div>
      {rows.length > 5 && (
        <a href="#" className="mt-3 inline-flex items-center gap-1 text-red-deep" style={{ fontSize: 11, fontWeight: 700 }}>
          Ver {Math.max(totalProviders - 5, 0)} más y resto ({restPct.toFixed(0)}%) →
        </a>
      )}
    </div>
  );
}
