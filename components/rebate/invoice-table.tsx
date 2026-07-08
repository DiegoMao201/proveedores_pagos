import { Card } from "@/components/ui/card";
import { formatCompact, formatDateEs } from "@/lib/format";
import type { RebateInvoiceRow } from "@/lib/rebate-data";

const ESTADO_LABELS: Record<RebateInvoiceRow["estado_erp"], { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "text-orange" },
  saldada: { label: "Saldada", className: "text-success" },
  sin_match: { label: "Sin match en ERP", className: "text-red-deep" },
};

export function InvoiceTable({ rows, limit }: { rows: RebateInvoiceRow[]; limit: number }) {
  const totalNeto = rows.reduce((acc, r) => acc + (r.es_nota_credito ? -1 : 1) * r.valor_base_correo, 0);
  const totalNc = rows.filter((r) => r.es_nota_credito).length;
  const totalPendientes = rows.filter((r) => r.estado_erp === "pendiente").length;
  const totalSaldadas = rows.filter((r) => r.estado_erp === "saldada").length;
  const totalSinMatch = rows.filter((r) => r.estado_erp === "sin_match").length;

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
        <h2 className="text-graphite" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Facturas y fuente
        </h2>
        <p className="text-stone" style={{ fontSize: 10 }}>
          Últimas {rows.length} de {limit} máx. · {totalNc} notas crédito · {totalPendientes} pendientes · {totalSaldadas} saldadas
          {totalSinMatch > 0 ? ` · ${totalSinMatch} sin match en ERP` : ""} · neto {formatCompact(totalNeto)}
        </p>
      </div>
      <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
        <table className="w-full" style={{ fontSize: 11 }}>
          <thead className="sticky top-0 bg-paper">
            <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th className="px-3 py-2 text-left">Factura</th>
              <th className="px-3 py-2 text-left">Fecha correo</th>
              <th className="px-3 py-2 text-right">Valor base</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">ERP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.invoice_key} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-mono text-ink" style={{ fontSize: 10 }}>
                  {r.invoice_key}
                </td>
                <td className="px-3 py-2 text-stone">{formatDateEs(r.fecha_emision_correo)}</td>
                <td className="num px-3 py-2 text-right text-ink">
                  {r.es_nota_credito ? "−" : ""}
                  {formatCompact(r.valor_base_correo)}
                </td>
                <td className="px-3 py-2">
                  {r.es_nota_credito ? (
                    <span
                      className="inline-flex items-center rounded-full bg-red/10 px-2.5 py-0.5 font-semibold text-red-deep"
                      style={{ fontSize: 10 }}
                    >
                      Nota crédito
                    </span>
                  ) : (
                    <span className="text-stone">Factura</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={ESTADO_LABELS[r.estado_erp].className} style={{ fontWeight: 600 }}>
                    {ESTADO_LABELS[r.estado_erp].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
