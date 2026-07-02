const BUCKETS = [
  { key: "al_dia", label: "Al día", color: "var(--color-cream)" },
  { key: "1_14", label: "1-14 días vto", color: "var(--color-yellow)" },
  { key: "15_30", label: "15-30 días vto", color: "var(--color-orange)" },
  { key: "31_60", label: "31-60 días vto", color: "var(--color-red)" },
  { key: "mas_60", label: ">60 días vto", color: "var(--color-red-deep)" },
] as const;

export type AgingBucketKey = (typeof BUCKETS)[number]["key"];

interface AgingSwatchProps {
  counts: Partial<Record<AgingBucketKey, number>>;
}

export function AgingSwatch({ counts }: AgingSwatchProps) {
  const total = BUCKETS.reduce((sum, b) => sum + (counts[b.key] ?? 0), 0) || 1;

  return (
    <div className="w-full">
      <div className="flex h-3 w-full overflow-hidden rounded-sm">
        {BUCKETS.map((bucket) => {
          const value = counts[bucket.key] ?? 0;
          const widthPct = Math.max((value / total) * 100, value > 0 ? 4 : 0);
          return (
            <div
              key={bucket.key}
              title={`${bucket.label}: ${value}`}
              style={{ backgroundColor: bucket.color, width: `${widthPct}%` }}
              className="h-full first:rounded-l-sm last:rounded-r-sm"
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone">
        {BUCKETS.map((bucket) => (
          <span key={bucket.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: bucket.color }}
            />
            {bucket.label}
          </span>
        ))}
      </div>
    </div>
  );
}
