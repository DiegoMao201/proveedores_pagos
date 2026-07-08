import Link from "next/link";
import { cn } from "@/lib/cn";

interface TabDef {
  key: string;
  label: string;
  count: number;
}

export function ConciliacionTabs({
  active,
  tabs,
  todos,
  makeHref,
}: {
  active: string;
  tabs: TabDef[];
  todos?: boolean;
  makeHref?: (tabKey: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={makeHref ? makeHref(tab.key) : todos ? `/conciliacion?tab=${tab.key}&todos=1` : `/conciliacion?tab=${tab.key}`}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            active === tab.key ? "border-red text-red-deep" : "border-transparent text-stone hover:text-graphite"
          )}
        >
          {tab.label} <span className="num text-xs">({tab.count.toLocaleString("es-CO")})</span>
        </Link>
      ))}
    </div>
  );
}
