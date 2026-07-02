import type { CashflowWeekRow } from "@/lib/cartera-portfolio-data";
import { formatCompact } from "@/lib/format";

function weekColor(index: number, total: number, value: number): string {
  if (value <= 0) return "var(--color-cream)";
  if (index === 0) return "var(--color-red)";
  const ratio = index / Math.max(total - 1, 1);
  if (ratio < 0.33) return "var(--color-red)";
  if (ratio < 0.66) return "var(--color-orange)";
  return "var(--color-yellow)";
}

export function CashflowBars({ rows }: { rows: CashflowWeekRow[] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.total)));
  const total = rows.reduce((sum, r) => sum + Number(r.total), 0);

  return (
    <div>
      <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 13 }}>
        Cash flow proyectado
      </h2>
      <p className="text-stone" style={{ fontSize: 10 }}>
        Próximas {rows.length} semanas
      </p>
      <div className="mt-4 flex items-end gap-2" style={{ height: 110 }}>
        {rows.map((row, i) => {
          const heightPct = Math.max((Number(row.total) / max) * 100, 3);
          return (
            <div key={row.semana_inicio} className="flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
              <span className="num text-ink" style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>
                {formatCompact(Number(row.total))}
              </span>
              <div
                className="w-full rounded-t"
                style={{ height: `${heightPct}%`, backgroundColor: weekColor(i, rows.length, Number(row.total)), minHeight: 4 }}
              />
              <span className="text-stone" style={{ fontSize: 9, fontWeight: 700, marginTop: 4 }}>
                S{i + 1}
              </span>
              <span className="text-stone" style={{ fontSize: 8 }}>
                {new Date(row.semana_inicio).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-line" style={{ paddingTop: 8 }}>
        <span className="text-stone" style={{ fontSize: 10 }}>
          Total {rows.length} semanas
        </span>
        <span className="num text-ink" style={{ fontWeight: 800, fontSize: 13 }}>
          {formatCompact(total)}
        </span>
      </div>
    </div>
  );
}
