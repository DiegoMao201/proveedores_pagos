"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, TrendingUp, Layers, BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_SECTIONS = [
  {
    label: "Hoy",
    items: [{ href: "/", label: "Inicio", icon: Home }],
  },
  {
    label: "Trabajo",
    items: [
      { href: "/proveedores", label: "Proveedores", icon: Building2 },
      { href: "/rebate/pintuco", label: "Rebate", icon: TrendingUp },
      { href: "/lotes", label: "Lotes", icon: Layers },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/analisis/cartera", label: "Cartera", icon: BarChart3 },
      { href: "/analisis/conciliacion", label: "Conciliación", icon: BarChart3 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      className="hidden shrink-0 flex-col rounded-xl border border-line bg-paper md:flex"
      style={{ width: 148, margin: 14, padding: "14px 10px" }}
    >
      <div className="border-b border-line pb-3">
        <span
          className="block text-red"
          style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 15, letterSpacing: "-0.02em" }}
        >
          Ferreinox
        </span>
        <span
          className="block text-stone"
          style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em" }}
        >
          PAGOS PROV.
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p
              className="text-stone"
              style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", padding: "12px 6px 6px" }}
            >
              {section.label.toUpperCase()}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center transition-colors",
                        isActive ? "bg-cream-soft text-red-deep" : "text-graphite hover:bg-line-soft"
                      )}
                      style={{
                        padding: "7px 10px",
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 400,
                        borderRadius: isActive ? "0 8px 8px 0" : 8,
                        borderLeft: isActive ? "3px solid var(--color-red)" : "3px solid transparent",
                      }}
                    >
                      <Icon size={14} style={{ marginRight: 8 }} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
