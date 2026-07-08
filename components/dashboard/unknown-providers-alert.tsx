import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatFull } from "@/lib/format";
import type { UnknownProviderRow } from "@/lib/bank-account-data";

export function UnknownProvidersAlert({ rows }: { rows: UnknownProviderRow[] }) {
  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.pendiente_total, 0);

  return (
    <Card style={{ background: "var(--color-cream-soft)", borderLeft: "4px solid var(--color-orange)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-orange" />
          <div>
            <p className="text-ink" style={{ fontSize: 13, fontWeight: 800 }}>
              {rows.length} proveedores nuevos en cartera
            </p>
            <p className="text-stone" style={{ fontSize: 10 }}>
              Aparecen en el ERP pero no están registrados. Total pendiente: {formatFull(total)}
            </p>
          </div>
        </div>
        <Link
          href="/proveedores#desconocidos"
          prefetch={false}
          className="shrink-0 rounded-md bg-red-deep px-3 py-1.5 text-white"
          style={{ fontSize: 11, fontWeight: 800 }}
        >
          Revisar →
        </Link>
      </div>
    </Card>
  );
}
