"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { ReactivationModal } from "@/components/shared/reactivation-modal";
import { formatCurrency, formatDateEs, humanizeProviderName } from "@/lib/format";
import type { ExcludedInvoiceRow } from "@/lib/exclusion-data";

const FUENTE_LABELS: Record<string, { label: string; bg: string }> = {
  ambos: { label: "ERP + Correo", bg: "var(--color-line-soft)" },
  solo_correo: { label: "Solo correo", bg: "var(--color-cream)" },
  solo_erp: { label: "Solo ERP", bg: "var(--color-cream-soft)" },
  ninguno: { label: "Sin datos", bg: "var(--color-graphite)" },
};

export function ExcluidasTab({ rows }: { rows: ExcludedInvoiceRow[] }) {
  const [reactivating, setReactivating] = useState<ExcludedInvoiceRow | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-stone" style={{ fontSize: 11 }}>
          No hay facturas excluidas manualmente.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
          <tr>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3">N° factura</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3">Emisión</th>
            <th className="px-4 py-3">Motivo</th>
            <th className="px-4 py-3">Excluida por</th>
            <th className="px-4 py-3">Fecha exclusión</th>
            <th className="px-4 py-3">Fuente</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const fuente = FUENTE_LABELS[row.fuente] ?? FUENTE_LABELS.ninguno;
            return (
              <tr key={row.exclusion_id} className="border-b border-line last:border-0 hover:bg-cream/30">
                <td className="px-4 py-3 font-semibold text-ink">
                  {row.nombre_proveedor ?? humanizeProviderName(row.proveedor_norm)}
                </td>
                <td className="num px-4 py-3">{row.num_factura ?? "—"}</td>
                <td className="num px-4 py-3 text-right">{row.valor != null ? formatCurrency(row.valor) : "—"}</td>
                <td className="date px-4 py-3">{row.fecha_emision ? formatDateEs(row.fecha_emision) : "—"}</td>
                <td className="px-4 py-3 text-stone" style={{ maxWidth: 260 }}>
                  {row.motivo ?? "—"}
                </td>
                <td className="px-4 py-3 text-stone">{row.excluida_por_nombre ?? "—"}</td>
                <td className="date px-4 py-3">{formatDateEs(row.excluida_at)}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-ink"
                    style={{ fontSize: 9, background: fuente.bg }}
                  >
                    {fuente.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setReactivating(row)}
                    className="flex items-center gap-1 text-stone hover:text-success"
                    style={{ fontSize: 10, fontWeight: 700 }}
                  >
                    <RotateCcw size={10} /> Reactivar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {reactivating && (
        <ReactivationModal
          open={true}
          onClose={() => setReactivating(null)}
          invoiceKey={reactivating.invoice_key}
          numFactura={reactivating.num_factura}
          proveedor={reactivating.nombre_proveedor}
          motivoOriginal={reactivating.motivo}
          excluidaAt={reactivating.excluida_at}
          excluidaPorNombre={reactivating.excluida_por_nombre}
          onReactivated={() => setReactivating(null)}
        />
      )}
    </div>
  );
}
