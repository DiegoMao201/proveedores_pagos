import Link from "next/link";
import { cn } from "@/lib/cn";

const PROVIDERS = [
  { key: "pintuco", label: "Pintuco", href: "/rebate/pintuco" },
  { key: "abracol", label: "Abracol", href: "/rebate/abracol" },
  { key: "goya", label: "Goya", href: "/rebate/goya" },
] as const;

export function RebateTabs({ active }: { active: "pintuco" | "abracol" | "goya" }) {
  return (
    <div className="flex gap-1 border-b border-line">
      {PROVIDERS.map((p) => (
        <Link
          key={p.key}
          href={p.href}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            active === p.key ? "border-red text-red-deep" : "border-transparent text-stone hover:text-graphite"
          )}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
