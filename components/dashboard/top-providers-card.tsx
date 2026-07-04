import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatFull, humanizeProviderName } from "@/lib/format";
import type { TopProviderRow } from "@/lib/dashboard-data";

export function TopProvidersCard({ providers }: { providers: TopProviderRow[] }) {
  return (
    <Card>
      <div style={{ marginBottom: 8 }}>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 14 }}>Top proveedores por volumen</h2>
        <p className="text-stone" style={{ fontSize: 10 }}>Cartera pendiente activa</p>
      </div>

      {providers.length === 0 ? (
        <p className="text-stone" style={{ fontSize: 11 }}>No hay cartera activa en este momento.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {providers.slice(0, 5).map((p) => (
            <Link
              key={p.proveedor_id}
              href={`/proveedores/${p.proveedor_id}`}
              className="flex items-center justify-between gap-2 rounded-md bg-parchment px-3 py-2 transition-colors hover:bg-cream-soft"
            >
              <div className="min-w-0">
                <p className="truncate text-ink" style={{ fontSize: 12, fontWeight: 700 }}>{humanizeProviderName(p.nombre_proveedor)}</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className="rounded-full px-1.5 py-0.5 font-semibold"
                    style={{
                      fontSize: 8.5,
                      background: p.categoria_proveedor === "estrategico" ? "var(--color-success-soft)" : "var(--color-cream)",
                      color: p.categoria_proveedor === "estrategico" ? "var(--color-success)" : "var(--color-orange)",
                    }}
                  >
                    {p.categoria_proveedor === "estrategico" ? "Estratégico" : "Locativo"}
                  </span>
                  <span className="text-stone" style={{ fontSize: 9.5 }}>
                    {p.num_facturas} facturas{p.num_ncs > 0 ? ` + ${p.num_ncs} NCs` : ""}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="num text-ink" style={{ fontSize: 13, fontWeight: 800 }}>{formatFull(p.neto_total)}</span>
                {p.dias_a_vencer_mas_urgente != null && p.dias_a_vencer_mas_urgente <= 5 && (
                  <span className="rounded-full bg-red-deep px-1.5 py-0.5 font-semibold text-white" style={{ fontSize: 8.5 }}>
                    ⚠ Vence en {p.dias_a_vencer_mas_urgente}d
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-2 text-right">
        <Link href="/proveedores" prefetch={false} className="text-red-deep" style={{ fontSize: 10, fontWeight: 700 }}>
          Ver todos los proveedores →
        </Link>
      </div>
    </Card>
  );
}
