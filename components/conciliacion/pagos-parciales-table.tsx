import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { formatCurrency, formatDateEs, humanizeProviderName } from "@/lib/format";
import type { PartialPaymentStatusRow } from "@/lib/partial-payment-data";

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  conciliado: { label: "Conciliado", color: "var(--color-success)", bg: "var(--color-success-soft)", icon: <CheckCircle2 size={12} /> },
  pendiente_confirmacion_erp: { label: "Esperando confirmación del ERP", color: "var(--color-orange)", bg: "var(--color-cream-soft)", icon: <Clock size={12} /> },
  alerta_no_concilia: { label: "No concilia", color: "var(--color-red-deep)", bg: "#FCEBEB", icon: <AlertTriangle size={12} /> },
  factura_no_encontrada_en_erp: { label: "Factura no encontrada en el ERP", color: "var(--color-red-deep)", bg: "#FCEBEB", icon: <HelpCircle size={12} /> },
};

export function PagosParcialesTable({ rows }: { rows: PartialPaymentStatusRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
          <tr>
            <th className="px-6 py-3">Proveedor</th>
            <th className="px-4 py-3">Factura</th>
            <th className="px-4 py-3">Lote</th>
            <th className="px-4 py-3 text-right">Pagado</th>
            <th className="px-4 py-3 text-right">Saldo esperado</th>
            <th className="px-4 py-3 text-right">Valor ERP actual</th>
            <th className="px-6 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cfg = ESTADO_CONFIG[row.estado_conciliacion] ?? ESTADO_CONFIG.pendiente_confirmacion_erp;
            return (
              <tr key={row.id} className="border-b border-line last:border-0 hover:bg-cream/30">
                <td className="px-6 py-3 font-semibold text-ink">{row.proveedor_nombre ? humanizeProviderName(row.proveedor_nombre) : "—"}</td>
                <td className="num px-4 py-3">{row.invoice_key.split("|")[1] ?? row.invoice_key}</td>
                <td className="px-4 py-3">
                  <Link href={`/lotes/${row.codigo_lote}`} className="text-stone hover:text-red-deep">{row.codigo_lote}</Link>
                </td>
                <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_pagado)}</td>
                <td className="num px-4 py-3 text-right">{formatCurrency(row.saldo_esperado)}</td>
                <td className="num px-4 py-3 text-right">{row.valor_erp_actual != null ? formatCurrency(row.valor_erp_actual) : "—"}</td>
                <td className="px-6 py-3">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold"
                    style={{ fontSize: 9.5, background: cfg.bg, color: cfg.color }}
                    title={row.motivo}
                  >
                    {cfg.icon} {cfg.label}
                  </span>
                  {row.created_at && (
                    <p className="text-stone" style={{ fontSize: 9, marginTop: 2 }}>
                      {formatDateEs(row.created_at)} · {row.created_by_nombre ?? "—"}
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
