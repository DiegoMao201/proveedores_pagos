import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatFull, formatDateEs, humanizeProviderName } from "@/lib/format";
import type { UrgentInvoiceRow } from "@/lib/dashboard-data";

const URGENCIA_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  vencida: { label: "Vencida", bg: "var(--color-red-deep)", color: "#fff" },
  critica: { label: "Crítica", bg: "var(--color-red)", color: "#fff" },
  urgente: { label: "Urgente", bg: "var(--color-orange)", color: "#fff" },
  proxima: { label: "Próxima", bg: "var(--color-cream)", color: "var(--color-graphite)" },
};

export function UrgentInvoicesCard({ invoices }: { invoices: UrgentInvoiceRow[] }) {
  const vencidas = invoices.filter((i) => i.nivel_urgencia === "vencida").length;
  const criticas = invoices.filter((i) => i.nivel_urgencia === "critica").length;
  const urgentes = invoices.filter((i) => i.nivel_urgencia === "urgente").length;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 14 }}>Facturas urgentes</h2>
          <p className="text-stone" style={{ fontSize: 10 }}>Vencen en ≤10 días · ordenadas por urgencia</p>
        </div>
        <div className="flex gap-1.5">
          {vencidas > 0 && (
            <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9, background: "var(--color-red-deep)" }}>
              {vencidas} vencidas
            </span>
          )}
          {criticas > 0 && (
            <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9, background: "var(--color-red)" }}>
              {criticas} críticas
            </span>
          )}
          {urgentes > 0 && (
            <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9, background: "var(--color-orange)" }}>
              {urgentes} urgentes
            </span>
          )}
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="text-stone" style={{ fontSize: 11 }}>✓ No hay facturas venciendo en los próximos 10 días.</p>
      ) : (
        <div className="flex flex-col">
          {invoices.slice(0, 10).map((inv) => {
            const urgencia = URGENCIA_LABELS[inv.nivel_urgencia] ?? URGENCIA_LABELS.proxima;
            return (
              <div key={inv.invoice_key} className="flex items-center gap-2 border-b border-line py-1.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink" style={{ fontSize: 11.5, fontWeight: 700 }}>{humanizeProviderName(inv.nombre_proveedor)}</p>
                  <p className="truncate text-stone" style={{ fontSize: 10 }}>{inv.num_factura}</p>
                </div>
                <span className="text-stone" style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>
                  {inv.fecha_vencimiento ? formatDateEs(inv.fecha_vencimiento) : "—"}
                </span>
                <span className="num text-ink" style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{formatFull(inv.valor_neto)}</span>
                <span
                  className="rounded-full px-2 py-0.5 font-semibold"
                  style={{ fontSize: 9, background: urgencia.bg, color: urgencia.color, whiteSpace: "nowrap" }}
                >
                  {urgencia.label}
                </span>
                {inv.descuento_en_riesgo && (
                  <span className="rounded-full bg-cream-soft px-2 py-0.5 font-semibold text-orange" style={{ fontSize: 9, whiteSpace: "nowrap" }}>
                    −{formatFull(inv.valor_descuento)}
                  </span>
                )}
                <Link href={`/proveedores/${inv.proveedor_id}`} className="text-stone hover:text-red-deep" style={{ fontSize: 10, fontWeight: 700 }}>
                  Ver →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 text-right">
        <Link href="/mesa-de-pagos" prefetch={false} className="text-red-deep" style={{ fontSize: 10, fontWeight: 700 }}>
          Ver todas en Mesa de pagos →
        </Link>
      </div>
    </Card>
  );
}
