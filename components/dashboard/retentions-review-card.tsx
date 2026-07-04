import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatFull, humanizeProviderName } from "@/lib/format";
import type { RetentionToReviewRow } from "@/lib/dashboard-data";

const FLAG_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  autoretenedor_con_fuente: { label: "AUTORRET + FUENTE", bg: "var(--color-red-deep)", color: "#fff" },
  retencion_alta: { label: "RETENCIÓN >30%", bg: "var(--color-orange)", color: "#fff" },
  triple_retencion: { label: "TRIPLE", bg: "var(--color-cream)", color: "var(--color-graphite)" },
};

export function RetentionsReviewCard({ retentions }: { retentions: RetentionToReviewRow[] }) {
  return (
    <Card>
      <div style={{ marginBottom: 8 }}>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 14 }}>Retenciones a revisar</h2>
        <p className="text-stone" style={{ fontSize: 10 }}>Casos con flags operativos — verificar antes del pago</p>
      </div>

      {retentions.length === 0 ? (
        <p className="text-success" style={{ fontSize: 11, fontWeight: 600 }}>
          ✓ Todas las retenciones aplicadas están dentro de parámetros normales.
        </p>
      ) : (
        <div className="flex flex-col">
          {retentions.map((r) => {
            const flag = FLAG_LABELS[r.flag_revision];
            return (
              <div key={r.invoice_key} className="flex items-center gap-2 border-b border-line py-1.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink" style={{ fontSize: 11.5, fontWeight: 700 }}>{humanizeProviderName(r.nombre_proveedor)}</p>
                  <p className="truncate text-stone" style={{ fontSize: 10 }}>{r.num_factura}</p>
                </div>
                <span className="num text-orange" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                  −{formatFull(r.retencion_total)} ({r.retencion_pct}%)
                </span>
                {flag && (
                  <span className="rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 8.5, background: flag.bg, color: flag.color, whiteSpace: "nowrap" }}>
                    {flag.label}
                  </span>
                )}
                <span className="num text-stone" style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>{formatFull(r.valor_bruto)}</span>
                <Link href={`/proveedores/${r.proveedor_id}`} className="text-stone hover:text-red-deep" style={{ fontSize: 10, fontWeight: 700 }}>
                  Ver →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
