import { formatCompact } from "@/lib/format";

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

export interface BarDatum {
  category: string;
  values: Record<string, number>;
}

export function StackedBarChart({ series, data, height = 160 }: { series: BarSeries[]; data: BarDatum[]; height?: number }) {
  const totals = data.map((d) => series.reduce((sum, s) => sum + Math.max(d.values[s.key] ?? 0, 0), 0));
  const max = Math.max(1, ...totals);

  return (
    <div>
      <div className="flex items-end gap-3" style={{ height }}>
        {data.map((d) => {
          const total = series.reduce((sum, s) => sum + Math.max(d.values[s.key] ?? 0, 0), 0);
          return (
            <div key={d.category} className="flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
              {total > 0 && (
                <span className="num text-ink" style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>
                  {formatCompact(total)}
                </span>
              )}
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-t" style={{ height: `${Math.max((total / max) * 100, total > 0 ? 3 : 0)}%`, minHeight: total > 0 ? 4 : 0 }}>
                {series.map((s) => {
                  const value = Math.max(d.values[s.key] ?? 0, 0);
                  if (value <= 0) return null;
                  const segmentPct = (value / total) * 100;
                  return <div key={s.key} style={{ height: `${segmentPct}%`, backgroundColor: s.color }} />;
                })}
              </div>
              <span className="text-stone" style={{ fontSize: 9, fontWeight: 700, marginTop: 4 }}>
                {d.category}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 border-t border-line" style={{ paddingTop: 8 }}>
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-stone" style={{ fontSize: 10 }}>
            <span className="inline-block rounded-sm" style={{ width: 8, height: 8, backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
