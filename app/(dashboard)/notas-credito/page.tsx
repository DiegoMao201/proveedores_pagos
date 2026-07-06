import { AlertCircle, FileMinus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getNotasCreditoEstrategicas } from "@/lib/notas-credito-data";
import { formatFull, formatDateEs } from "@/lib/format";
import { NotasCreditoExportButton } from "@/components/notas-credito/export-button";

export default async function NotasCreditoPage() {
  let dataError: string | null = null;
  let rows: Awaited<ReturnType<typeof getNotasCreditoEstrategicas>> = [];

  try {
    rows = await getNotasCreditoEstrategicas();
  } catch (e) {
    dataError = e instanceof Error ? e.message : "Error desconocido";
  }

  const total = rows.reduce((s, r) => s + r.valor_bruto, 0);
  const disponibles = rows.filter((r) => r.es_seleccionable);
  const esperando = rows.filter((r) => !r.es_seleccionable);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notas crédito</h1>
          <p className="text-sm text-stone">
            Todas las notas crédito pendientes de proveedores estratégicos (mercancía), en un solo lugar.
          </p>
        </div>
        <NotasCreditoExportButton disabled={rows.length === 0} />
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar las notas crédito. {dataError}
          </p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <FileMinus size={32} className="text-stone" />
          <p className="text-stone" style={{ fontSize: 11 }}>
            No hay notas crédito pendientes de proveedores estratégicos.
          </p>
        </Card>
      ) : (
        <>
          <p className="text-stone" style={{ fontSize: 11 }}>
            {rows.length} notas crédito · {formatFull(Math.abs(total))} en total ·{" "}
            {disponibles.length} disponibles para aplicar · {esperando.length} esperando nota de proveedor
          </p>

          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 11 }}>
                <thead className="sticky top-0 bg-paper">
                  <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th className="px-3 py-2 text-left" style={{ width: 24 }}></th>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-left">Nota crédito</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-left">Estado</th>
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
                        style={{ background: !inv.es_seleccionable ? "var(--color-line-soft)" : "transparent" }}
                        title={!inv.es_seleccionable ? inv.motivo_no_seleccionable ?? undefined : undefined}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={false}
                            disabled
                            readOnly
                            style={{ width: 14, height: 14, accentColor: "var(--color-red-deep)" }}
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-ink">{inv.nombre_proveedor}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
