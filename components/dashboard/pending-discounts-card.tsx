import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatFull, formatCompact, formatDateEs, humanizeProviderName } from "@/lib/format";
import type { PendingDiscountRow } from "@/lib/dashboard-data";

const ESTADO_STYLE: Record<string, { bg: string; opacity: number; strike: boolean }> = {
  ya_perdido: { bg: "transparent", opacity: 0.5, strike: true },
  critico: { bg: "var(--color-cream)", opacity: 1, strike: false },
  urgente: { bg: "var(--color-cream-soft)", opacity: 1, strike: false },
  vigente: { bg: "transparent", opacity: 1, strike: false },
};

const ESTADO_LABELS: Record<string, string> = {
  ya_perdido: "Perdido",
  critico: "Crítico",
  urgente: "Urgente",
  vigente: "Vigente",
};

export function PendingDiscountsCard({ discounts }: { discounts: PendingDiscountRow[] }) {
  const capturable = discounts
    .filter((d) => d.estado_descuento !== "ya_perdido")
    .reduce((s, d) => s + d.valor_descuento, 0);
  const aPerder = discounts
    .filter((d) => d.estado_descuento === "urgente" || d.estado_descuento === "critico")
    .reduce((s, d) => s + d.valor_descuento, 0);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 14 }}>Descuentos por capturar</h2>
          <p className="text-stone" style={{ fontSize: 10 }}>Ahorro pronto pago disponible</p>
        </div>
        <div className="flex gap-1.5">
          <span className="rounded-full bg-success px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>
            {formatCompact(capturable)} disponible
          </span>
          {aPerder > 0 && (
            <span className="rounded-full bg-orange px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>
              {formatCompact(aPerder)} en riesgo
            </span>
          )}
        </div>
      </div>

      {discounts.length === 0 ? (
        <p className="text-stone" style={{ fontSize: 11 }}>No hay descuentos por pronto pago vigentes.</p>
      ) : (
        <div className="flex flex-col">
          {discounts.slice(0, 10).map((d) => {
            const style = ESTADO_STYLE[d.estado_descuento] ?? ESTADO_STYLE.vigente;
            return (
              <div
                key={d.invoice_key}
                className="flex items-center gap-2 border-b border-line py-1.5 last:border-0"
                style={{ background: style.bg, opacity: style.opacity, textDecoration: style.strike ? "line-through" : "none" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink" style={{ fontSize: 11.5, fontWeight: 700 }}>{humanizeProviderName(d.nombre_proveedor)}</p>
                  <p className="truncate text-stone" style={{ fontSize: 10 }}>{d.num_factura}</p>
                </div>
                <span className="num text-success" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                  −{formatFull(d.valor_descuento)} ({d.descuento_pct}%)
                </span>
                <span className="text-stone" style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>
                  {d.fecha_vencimiento ? formatDateEs(d.fecha_vencimiento) : "—"}
                </span>
                <span className="rounded-full bg-line-soft px-2 py-0.5 font-semibold text-graphite" style={{ fontSize: 9, whiteSpace: "nowrap" }}>
                  {ESTADO_LABELS[d.estado_descuento]}
                </span>
                <Link href={`/proveedores/${d.proveedor_id}`} className="text-stone hover:text-red-deep" style={{ fontSize: 10, fontWeight: 700 }}>
                  Ver →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 text-right">
        <Link href="/mesa-de-pagos" prefetch={false} className="text-red-deep" style={{ fontSize: 10, fontWeight: 700 }}>
          Ir a Mesa de pagos para capturar →
        </Link>
      </div>
    </Card>
  );
}
