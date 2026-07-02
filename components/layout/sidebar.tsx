"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, Wallet, GitMerge, Building2, Search, TrendingUp, CalendarClock } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_SECTIONS = [
  {
    label: "Principal",
    items: [{ href: "/", label: "Inicio", icon: Home }],
  },
  {
    label: "Tesorería",
    items: [
      { href: "/facturas", label: "Facturas", icon: FileText },
      { href: "/cartera/pendiente", label: "Cartera", icon: Wallet },
      { href: "/conciliacion", label: "Conciliación", icon: GitMerge },
      { href: "/planificador", label: "Planificador", icon: CalendarClock },
    ],
  },
  {
    label: "Gestión",
    items: [
      { href: "/proveedores", label: "Proveedores", icon: Building2 },
      { href: "/rebate/pintuco", label: "Rebate", icon: TrendingUp },
    ],
  },
];

// Franja de marca: reusa la paleta del signature element (muestra de pintura) como
// acento decorativo -- misma metafora de color, sin iconografia nueva (brief 4.1).
const BRAND_STRIPE = ["#FEF4C0", "#F9B016", "#F0833A", "#E73537", "#B21917"];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-paper">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-extrabold tracking-tight text-red">Ferreinox</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-stone">Pagos proveedores</p>
        <div className="mt-3 flex h-1 overflow-hidden rounded-full">
          {BRAND_STRIPE.map((color) => (
            <span key={color} className="h-full flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>

      <button
        onClick={() => router.push("?search=1")}
        className="mx-4 mb-4 flex items-center gap-2 rounded-md border border-line bg-parchment px-3 py-2 text-left text-sm text-stone transition-colors hover:border-stone hover:bg-cream/40"
      >
        <Search size={15} />
        <span className="flex-1">Buscar todo...</span>
        <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] font-semibold text-stone">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-widest text-stone/70">
              {section.label}
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
                        "group relative flex items-center gap-3 rounded-md py-2.5 pl-3.5 pr-3 text-sm font-semibold transition-all duration-150",
                        isActive ? "bg-cream text-red-deep" : "text-graphite hover:bg-parchment"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-red transition-opacity",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Icon size={19} className={isActive ? "text-red-deep" : "text-stone group-hover:text-graphite"} />
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
