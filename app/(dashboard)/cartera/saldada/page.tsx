import { AlertCircle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PaidDetail } from "@/components/cartera/paid-detail";
import { getPaid, getPaidByKey, type ErpPaid } from "@/lib/cartera-data";
import { formatCurrency, formatCompact, formatDateEs } from "@/lib/format";
import { CarteraTabs } from "@/components/cartera/cartera-tabs";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CarteraSaldadaPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const pageSize = Number(sp.pageSize ?? "50") || 50;

  let rows: ErpPaid[] = [];
  let total = 0;
  let dataError: string | null = null;
  let pageTotal = 0;

  try {
    const result = await getPaid({
      page,
      pageSize,
      q: sp.q,
      fechaDesde: sp.fechaDesde,
      fechaHasta: sp.fechaHasta,
    });
    rows = result.rows;
    total = result.total;
    pageTotal = rows.reduce((sum, r) => sum + Number(r.valor_total_erp ?? 0), 0);
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  const detail = sp.factura ? await getPaidByKey(sp.factura) : null;
  const closeParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key !== "factura" && value) closeParams.set(key, value);
  }
  const closeHref = `/cartera/saldada?${closeParams.toString()}`;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
          Cartera
        </h1>
        <p className="text-stone" style={{ fontSize: 12 }}>Facturas ya pagadas según el ERP.</p>
      </div>

      <CarteraTabs active="saldada" />

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Card>
          <p className="text-stone" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Total en esta página
          </p>
          <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{formatCompact(pageTotal)}</p>
        </Card>
        <Card>
          <p className="text-stone" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Facturas filtradas
          </p>
          <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{total.toLocaleString("es-CO")}</p>
        </Card>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar la cartera saldada. Verifica tu conexión y reintenta.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
          <TableToolbar
            searchPlaceholder="Buscar por proveedor o número..."
            filterFields={[
              { name: "fechaDesde", label: "Vence desde", type: "date" },
              { name: "fechaHasta", label: "Vence hasta", type: "date" },
            ]}
          />

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <CheckCircle size={48} className="text-stone" />
              <p className="text-sm text-stone">Ninguna factura saldada coincide con estos filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
                  <tr>
                    <th className="px-6 py-3">Proveedor</th>
                    <th className="px-4 py-3">Número</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Emisión</th>
                    <th className="px-4 py-3">Vencimiento</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-6 py-3">Sincronizado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0 hover:bg-cream/30">
                      <td className="px-6 py-3">
                        <a
                          href={`/cartera/saldada?${new URLSearchParams({ ...sp, factura: row.invoice_key } as Record<string, string>).toString()}`}
                          className="block font-semibold text-ink hover:text-red"
                        >
                          {row.nombre_proveedor_erp}
                        </a>
                      </td>
                      <td className="num px-4 py-3">{row.num_factura}</td>
                      <td className="px-4 py-3 text-stone">{row.estado_documento ?? "—"}</td>
                      <td className="date px-4 py-3">{row.fecha_emision_erp ? formatDateEs(row.fecha_emision_erp) : "—"}</td>
                      <td className="date px-4 py-3">{row.fecha_vencimiento_erp ? formatDateEs(row.fecha_vencimiento_erp) : "—"}</td>
                      <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_erp)}</td>
                      <td className="date px-6 py-3">{formatDateEs(row.synced_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <TablePagination page={page} pageSize={pageSize} total={total} basePath="/cartera/saldada" searchParams={sp} />
        </div>
      )}

      <Drawer open={Boolean(detail)} onCloseHref={closeHref} title={detail?.num_factura ?? "Detalle"}>
        {detail && <PaidDetail row={detail} />}
      </Drawer>
    </div>
  );
}
