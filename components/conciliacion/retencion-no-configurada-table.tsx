import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { formatCurrency, formatDateEs, humanizeProviderName } from "@/lib/format";
import type { RetencionNoConfiguradaRow } from "@/lib/retention-suggestion-data";

export function RetencionNoConfiguradaTable({ rows }: { rows: RetencionNoConfiguradaRow[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-2 px-6 pt-3" style={{ fontSize: 10.5 }}>
        <Lightbulb size={14} className="mt-0.5 shrink-0 text-orange" />
        <p className="text-stone">
          Estas facturas tienen correo (valor bruto real) y ERP (valor pendiente) con una diferencia consistente, pero
          el proveedor no tiene ninguna retención configurada. Probablemente el ERP ya está aplicando una retención
          que la app no conoce — revisa y créala en la ficha del proveedor para que los cálculos cuadren.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
          <tr>
            <th className="px-6 py-3">Proveedor</th>
            <th className="px-4 py-3">Factura</th>
            <th className="px-4 py-3 text-right">Correo (bruto)</th>
            <th className="px-4 py-3 text-right">ERP (pendiente)</th>
            <th className="px-4 py-3 text-right">Diferencia</th>
            <th className="px-4 py-3 text-right">%</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.invoice_key} className="border-b border-line last:border-0 hover:bg-cream/30">
              <td className="px-6 py-3 font-semibold text-ink">{humanizeProviderName(row.proveedor_nombre)}</td>
              <td className="num px-4 py-3">
                {row.num_factura}
                {row.fecha_emision && <span className="ml-1.5 text-stone">· {formatDateEs(row.fecha_emision)}</span>}
              </td>
              <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_correo)}</td>
              <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_erp)}</td>
              <td className="num px-4 py-3 text-right font-semibold text-orange">{formatCurrency(row.diferencia)}</td>
              <td className="num px-4 py-3 text-right text-orange">{row.diferencia_pct}%</td>
              <td className="px-6 py-3 text-right">
                <Link href={`/proveedores/${row.proveedor_id}`} className="text-stone hover:text-red-deep" style={{ fontSize: 10.5, fontWeight: 700 }}>
                  Revisar proveedor
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
