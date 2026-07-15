"use client";

import { Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatFull, formatDateEs } from "@/lib/format";
import type { SedeAbonoRow } from "@/lib/sede-abono-data";

const ESTADO_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  disponible: { label: "Disponible", bg: "var(--color-cream-soft)", color: "var(--color-orange)" },
  aplicado: { label: "Aplicado a lote", bg: "var(--color-success-soft)", color: "var(--color-success)" },
  anulado: { label: "Anulado", bg: "var(--color-line-soft)", color: "var(--color-graphite)" },
};

export function SedeAbonoHistory({ abonos }: { abonos: SedeAbonoRow[] }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-3.5 py-2.5" style={{ background: "var(--color-parchment)" }}>
        <p className="text-ink" style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Mis abonos reportados</p>
      </div>
      {abonos.length === 0 ? (
        <p className="p-4 text-stone" style={{ fontSize: 12 }}>Todavía no has reportado ningún abono.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 11.5 }}>
            <thead>
              <tr className="border-b border-line bg-parchment text-stone" style={{ fontSize: 9, textTransform: "uppercase" }}>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Referencia</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2" style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {abonos.map((a) => {
                const estado = ESTADO_LABELS[a.estado];
                return (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="date px-3 py-2 text-stone">{formatDateEs(a.fecha_consignacion)}</td>
                    <td className="num px-3 py-2 text-right font-semibold text-ink">{formatFull(a.valor)}</td>
                    <td className="px-3 py-2 text-stone">{a.numero_referencia ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 9.5, background: estado.bg, color: estado.color }}>
                        {estado.label}
                      </span>
                      {a.estado === "aplicado" && a.codigo_lote && (
                        <span className="ml-1 text-stone" style={{ fontSize: 9.5 }}>· {a.codigo_lote}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a href={`/api/abonos/${a.id}/comprobante`} target="_blank" rel="noreferrer" className="text-stone hover:text-red-deep" title="Ver comprobante">
                        <Eye size={14} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
