"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ExclusionModal, type ExclusionCandidate } from "@/components/shared/exclusion-modal";
import { formatCurrency, formatDateEs, humanizeProviderName } from "@/lib/format";
import type { EmailWithoutErpRow } from "@/lib/conciliacion-data";

export function CorreoSinErpTable({ rows }: { rows: EmailWithoutErpRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalCandidates, setModalCandidates] = useState<ExclusionCandidate[] | null>(null);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const esNC = (r: EmailWithoutErpRow) => r.tipo_documento_correo === "NOTA_CREDITO" || r.num_factura.toUpperCase().startsWith("NC-");

  const candidateFor = (r: EmailWithoutErpRow): ExclusionCandidate => ({
    invoiceKey: r.invoice_key,
    numFactura: r.num_factura,
    proveedor: humanizeProviderName(r.proveedor_correo ?? ""),
    valor: r.valor_total_correo,
    esNotaCredito: esNC(r),
  });

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.invoice_key)), [rows, selected]);

  return (
    <div className="flex flex-col gap-2">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md bg-cream-soft px-4 py-2">
          <span className="text-ink" style={{ fontSize: 11, fontWeight: 700 }}>
            {selected.size} seleccionadas
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalCandidates(selectedRows.map(candidateFor))}
              className="rounded-md bg-red-deep px-3 py-1.5 text-white"
              style={{ fontSize: 10.5, fontWeight: 700 }}
            >
              Excluir seleccionadas
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-graphite"
              style={{ fontSize: 10.5, fontWeight: 700 }}
            >
              Cancelar selección
            </button>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
          <tr>
            <th className="px-3 py-3" style={{ width: 24 }}></th>
            <th className="px-4 py-3">Proveedor (correo)</th>
            <th className="px-4 py-3">Número</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3">Emisión</th>
            <th className="px-6 py-3">Recepción</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const nc = esNC(row);
            return (
              <tr key={row.invoice_key} className="border-b border-line last:border-0 hover:bg-cream/30">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.invoice_key)}
                    onChange={() => toggle(row.invoice_key)}
                    style={{ width: 14, height: 14, accentColor: "var(--color-red-deep)" }}
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-ink">{humanizeProviderName(row.proveedor_correo ?? "")}</td>
                <td className="num px-4 py-3">
                  {nc && (
                    <span
                      className="mr-1.5 inline-flex items-center rounded-full bg-red-deep px-1.5 py-0.5 font-semibold text-white"
                      style={{ fontSize: 8.5 }}
                    >
                      NC
                    </span>
                  )}
                  {row.num_factura}
                </td>
                <td
                  className="num px-4 py-3 text-right"
                  style={nc ? { color: "var(--color-red-deep)", fontWeight: 700 } : undefined}
                >
                  {nc ? "−" : ""}
                  {formatCurrency(Math.abs(row.valor_total_correo))}
                </td>
                <td className="date px-4 py-3">{row.fecha_emision_correo ? formatDateEs(row.fecha_emision_correo) : "—"}</td>
                <td className="date px-6 py-3">{row.fecha_recepcion_correo ? formatDateEs(row.fecha_recepcion_correo) : "—"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setModalCandidates([candidateFor(row)])}
                    className="flex items-center gap-1 text-stone hover:text-red-deep"
                    style={{ fontSize: 10, fontWeight: 700 }}
                  >
                    <X size={10} /> Excluir
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {modalCandidates && (
        <ExclusionModal
          open={true}
          onClose={() => setModalCandidates(null)}
          candidates={modalCandidates}
          source="manual_ui_conciliacion"
          onExcluded={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
