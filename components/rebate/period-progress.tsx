import { Card } from "@/components/ui/card";
import { ScalePill } from "@/components/rebate/scale-pill";
import { formatCompact } from "@/lib/format";

export interface PeriodProgressItem {
  title: string;
  ganado: number;
  reason: string;
  progressPct: number;
  status: string;
}

export function PeriodProgressGrid({ items }: { items: PeriodProgressItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
              {item.title}
            </p>
            <ScalePill value={item.status} />
          </div>
          <p className="num text-ink" style={{ fontWeight: 800, fontSize: 19 }}>
            {formatCompact(item.ganado)}
          </p>
          <p className="text-stone" style={{ fontSize: 10, lineHeight: 1.4 }}>
            {item.reason}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-red"
              style={{ width: `${Math.max(0, Math.min(100, item.progressPct))}%` }}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
