"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ExclusionModal, type ExclusionCandidate } from "@/components/shared/exclusion-modal";
import { formatFull, formatDateEs } from "@/lib/format";
import type { NotaCreditoRow } from "@/lib/notas-credito-data";

const CATEGORIA_LABELS: Record<string, string> = {
  estrategico: "Estratégico",
  locativo: "Locativo",
  institucional: "Institucional",
};

export function NotasCreditoTable({ rows }: { rows: NotaCreditoRow[] }) {
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

  const candidateFor = (r: NotaCreditoRow): ExclusionCandidate => ({
    invoiceKey: r.invoice_key,
    numFactura: r.num_factura,
    proveedor: r.nombre_proveedor,
    valor: r.valor_bruto,
    esNotaCredito: true,
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

      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: 11 }}>
          <thead className="sticky top-0 bg-paper">
            <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th className="px-3 py-2 text-left" style={{ width: 24 }}></th>
              <th className="px-3 py-2 text-left">Proveedor</th>
              <th className="px-3 py-2 text-left">Categoría</th>
              <th className="px-3 py-2 text-left">Nota crédito</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => {
              const subtitle = inv.num_factura_matched
                ? `Match ✓ con interno ${inv.num_factura_erp_interno} · Emitida ${inv.fecha_emision ? formatDateEs(inv.fecha_emision) : "—"}`
                : inv.motivo_no_seleccionable
                ? `Interno del ERP · ${inv.motivo_no_seleccionable}`
                : `XML del proveedor · Sin registro en ERP`;
              return (
                <tr
                  key={inv.invoice_key}
                  className="border-b border-line last:border-0"
                  style={{ background: selected.has(inv.invoice_key) ? "var(--color-cream-soft)" : !inv.es_seleccionable ? "var(--color-line-soft)" : "transparent" }}
                  title={!inv.es_seleccionable ? inv.motivo_no_seleccionable ?? undefined : undefined}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(inv.invoice_key)}
                      onChange={() => toggle(inv.invoice_key)}
                      style={{ width: 14, height: 14, accentColor: "var(--color-red-deep)" }}
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-ink">{inv.nombre_proveedor}</td>
                  <td className="px-3 py-2 text-stone" style={{ fontSize: 10.5 }}>
                    {CATEGORIA_LABELS[inv.categoria_proveedor] ?? inv.categoria_proveedor}
                  </td>
                  <td className="px-3 py-2">
                    <p
                      className="font-semibold"
                      style={{ fontSize: 12, color: !inv.es_seleccionable ? "var(--color-graphite)" : "var(--color-red-deep)" }}
                    >
                      NC {inv.num_factura}
                      {!inv.es_seleccionable && (
                        <span
                          className="ml-1.5 inline-flex items-center rounded"
                          style={{ fontSize: 9, fontWeight: 700, background: "var(--color-cream)", color: "var(--color-orange)", padding: "1px 5px" }}
                        >
                          Interna sin XML
                        </span>
                      )}
                    </p>
                    <p className="text-stone" style={{ fontSize: 9.5 }}>
                      {subtitle}
                    </p>
                  </td>
                  <td className="num px-3 py-2 text-right" style={{ fontWeight: 700, color: "var(--color-red-deep)" }}>
                    −{formatFull(Math.abs(inv.valor_bruto))}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full bg-red-deep px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>
                      NC
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setModalCandidates([candidateFor(inv)])}
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
      </div>

      {modalCandidates && (
        <ExclusionModal
          open={true}
          onClose={() => setModalCandidates(null)}
          candidates={modalCandidates}
          source="manual_ui_notas_credito"
          onExcluded={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
