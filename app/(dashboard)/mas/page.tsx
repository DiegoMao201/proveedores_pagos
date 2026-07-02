import Link from "next/link";
import { Wallet, GitMerge, Settings, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";

const ITEMS = [
  { href: "/cartera/pendiente", label: "Cartera", icon: Wallet },
  { href: "/conciliacion", label: "Conciliación", icon: GitMerge },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export default function MasPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-bold text-ink">Más</h1>
      <Card className="!p-0 overflow-hidden">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 border-b border-line px-4 py-3 text-sm font-semibold text-graphite last:border-0 hover:bg-parchment"
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
        <div className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-deep">
          <LogOut size={18} />
          Cerrar sesión
        </div>
      </Card>
    </div>
  );
}
