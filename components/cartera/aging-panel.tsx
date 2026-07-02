import { formatCompact } from "@/lib/format";
import type { AgingBucketKey } from "@/components/ui/aging-swatch";

const BUCKETS: { key: AgingBucketKey; label: string; color: string; textOnColor: string }[] = [
  { key: "al_dia", label: "al día", color: "var(--color-cream)", textOnColor: "var(--color-graphite)" },
  { key: "1_14", label: "1-14d", color: "var(--color-yellow)", textOnColor: "var(--color-ink)" },
  { key: "15_30", label: "15-30d", color: "var(--color-orange)", textOnColor: "white" },
  { key: "31_60", label: "31-60d", color: "var(--color-red)", textOnColor: "white" },
  { key: "mas_60", label: ">60d", color: "var(--color-red-deep)", textOnColor: "white" },
];

export function AgingPanel({ totals }: { totals: Record<AgingBucketKey, number> }) {
  const grandTotal = BUCKETS.reduce((sum, b) => sum + (totals[b.key] ?? 0), 0) || 1;

  return (
    <div className="rounded-xl border border-line bg-paper" style={{ padding: 14 }}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 13 }}>
          Aging del portafolio
        </h2>
        <span className="text-stone" style={{ fontSize: 10 }}>
          {formatCompact(grandTotal)} por antigüedad
        </span>
      </div>
      <div className="mt-3 flex w-full overflow-hidden rounded-lg" style={{ height: 44 }}>
        {BUCKETS.map((bucket) => {
          const value = totals[bucket.key] ?? 0;
          const pct = (value / grandTotal) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={bucket.key}
              className="flex flex-col items-center justify-center overflow-hidden px-1 text-center"
              style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: bucket.color, color: bucket.textOnColor }}
              title={`${bucket.label}: ${formatCompact(value)} (${pct.toFixed(0)}%)`}
            >
              {pct > 8 && (
                <>
                  <span className="num" style={{ fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
                    {formatCompact(value)}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {pct.toFixed(0)}% · {bucket.label}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
