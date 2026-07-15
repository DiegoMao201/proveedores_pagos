"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Unlock, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDateEs, humanizeProviderName } from "@/lib/format";
import { LiberarInvoiceModal } from "@/components/conciliacion/liberar-invoice-modal";
import type { ErpWithoutEmailRow } from "@/lib/conciliacion-data";

const CATEGORIAS_YA_PAGABLES = new Set(["estrategico", "locativo"]);

// Ausencia de categoria_proveedor solo pasa en la variante _mercancia (esa
// vista siempre representa proveedores 'estrategico', ya pagables) -- por
// eso, sin dato, se asume ya disponible en vez de mostrar un botón que no
// aplicaría.
function yaDisponibleEnMesa(row: ErpWithoutEmailRow): boolean {
  if (row.liberada_manualmente) return true;
  if (!row.categoria_proveedor) return true;
  return CATEGORIAS_YA_PAGABLES.has(row.categoria_proveedor);
}

export function ErpSinCorreoTable({ rows }: { rows: ErpWithoutEmailRow[] }) {
  const [modalRow, setModalRow] = useState<ErpWithoutEmailRow | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
          <tr>
            <th className="px-6 py-3">Proveedor (ERP)</th>
            <th className="px-4 py-3">Número</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-6 py-3">Vencimiento</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const nc = row.valor_total_erp < 0;
            const disponible = yaDisponibleEnMesa(row);
            return (
              <tr key={row.invoice_key} className="border-b border-line last:border-0 hover:bg-cream/30">
                <td className="px-6 py-3 font-semibold text-ink">{humanizeProviderName(row.nombre_proveedor_erp)}</td>
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
                <td className="px-4 py-3 text-stone" style={{ textTransform: "capitalize" }}>{row.estado_erp}</td>
                <td className="num px-4 py-3 text-right" style={nc ? { color: "var(--color-red-deep)", fontWeight: 700 } : undefined}>
                  {nc ? "−" : ""}
                  {formatCurrency(Math.abs(row.valor_total_erp))}
                </td>
                <td className="date px-6 py-3">{row.fecha_vencimiento_erp ? formatDateEs(row.fecha_vencimiento_erp) : "—"}</td>
                <td className="px-4 py-3">
                  {nc ? null : disponible ? (
                    <Link
                      href="/mesa-de-pagos"
                      className="flex items-center justify-end gap-1 text-stone hover:text-red-deep"
                      style={{ fontSize: 10, fontWeight: 700 }}
                      title={row.liberada_manualmente ? "Habilitada manualmente" : "Ya disponible en Mesa de Pagos"}
                    >
                      {row.liberada_manualmente && <CheckCircle2 size={10} className="text-success" />}
                      Ir a Mesa de Pagos <ArrowRight size={10} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModalRow(row)}
                      className="flex items-center justify-end gap-1 text-stone hover:text-red-deep"
                      style={{ fontSize: 10, fontWeight: 700 }}
                    >
                      <Unlock size={10} /> Habilitar para pago
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {modalRow && (
        <LiberarInvoiceModal
          open={true}
          onClose={() => setModalRow(null)}
          invoiceKey={modalRow.invoice_key}
          numFactura={modalRow.num_factura}
          proveedor={humanizeProviderName(modalRow.nombre_proveedor_erp)}
          valor={modalRow.valor_total_erp}
        />
      )}
    </div>
  );
}
