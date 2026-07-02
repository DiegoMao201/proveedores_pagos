"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Wallet, GitMerge, Building2 } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/facturas", label: "Facturas", icon: FileText },
  { href: "/cartera/pendiente", label: "Cartera", icon: Wallet },
  { href: "/conciliacion", label: "Conciliación", icon: GitMerge },
  { href: "/proveedores", label: "Proveedores", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-line bg-paper py-4">
      <ul className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-150",
                  isActive
                    ? "bg-cream text-red-deep"
                    : "text-graphite hover:bg-parchment"
                )}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
