"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProviderSelectorProps {
  providerName: string;
  index: number;
  total: number;
}

export function ProviderSelector({ providerName, index, total }: ProviderSelectorProps) {
  const router = useRouter();

  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-2.5 border border-line bg-paper"
      style={{ borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}
    >
      <Search size={14} className="text-stone" />
      <span style={{ fontSize: 11, fontWeight: 700 }} className="text-ink">
        {providerName}
      </span>
      <button
        onClick={() => router.push("?search=1")}
        className="text-stone transition-colors hover:bg-line-soft"
        style={{ fontSize: 9, background: "var(--color-line-soft)", padding: "2px 6px", borderRadius: 4 }}
      >
        Cambiar proveedor · ⌘K
      </button>
      <span style={{ fontSize: 10 }} className="ml-auto text-stone">
        {index} de {total} proveedores activos
      </span>
    </div>
  );
}
