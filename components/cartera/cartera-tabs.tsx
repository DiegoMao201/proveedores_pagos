import Link from "next/link";
import { cn } from "@/lib/cn";

export function CarteraTabs({ active }: { active: "pendiente" | "saldada" }) {
  const tabs = [
    { key: "pendiente", label: "Pendiente", href: "/cartera/pendiente" },
    { key: "saldada", label: "Saldada", href: "/cartera/saldada" },
  ] as const;

  return (
    <div className="flex gap-1 border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            active === tab.key
              ? "border-red text-red-deep"
              : "border-transparent text-stone hover:text-graphite"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
