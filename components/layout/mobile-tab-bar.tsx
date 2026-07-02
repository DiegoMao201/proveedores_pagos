"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, TrendingUp, Layers, Menu } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/rebate/pintuco", label: "Rebate", icon: TrendingUp },
  { href: "/lotes", label: "Lotes", icon: Layers },
  { href: "/mas", label: "Más", icon: Menu },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-paper md:hidden"
      style={{ gridTemplateColumns: "repeat(5, 1fr)", padding: "8px 4px 12px" }}
    >
      {TABS.map((tab) => {
        const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 text-center">
            <Icon size={20} className={cn(isActive ? "text-red" : "text-stone")} />
            <span
              className={cn(isActive ? "text-red" : "text-stone")}
              style={{ fontSize: 9, fontWeight: isActive ? 700 : 400 }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
