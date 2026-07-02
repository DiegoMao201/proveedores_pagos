import { AlertCircle, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PendingDetail } from "@/components/cartera/pending-detail";
import { getPending, getPendingByKey, type ErpPending } from "@/lib/cartera-data";
import { getCapturableDiscountTotal, getDashboardKpis } from "@/lib/dashboard-data";
import { CarteraTabs } from "@/components/cartera/cartera-tabs";
import { formatCurrency, formatDateEs } from "@/lib/format";

const AGING_OPTIONS = [
  { value: "al_dia", label: "Al día" },
  { value: "1_14", label: "1-14 días" },
  { value: "15_30", label: "15-30 días" },
  { value: "31_60", label: "31-60 días" },
  { value: "mas_60", label: ">60 días" },
];

const AGING_BORDER: Record<string, string> = {
  al_dia: "border-l-line",
  "1_14": "border-l-yellow",
  "15_30": "border-l-orange",
  "31_60": "border-l-red",
  mas_60: "border-l-red-deep",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CarteraPendientePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const pageSize = Number(sp.pageSize ?? "50") || 50;

  let rows: ErpPending[] = [];
  let total = 0;
  let dataError: string | null = null;
  let conDescuentoCount = 0;
  // Total y conteo del PORTAFOLIO completo (no de la pagina/filtro actual) --
  // vienen de treasury.v_dashboard_kpis, ya agregados en Postgres.
  let portfolioTotal = 0;
  let portfolioCount = 0;

  try {
    const [result, discounts, kpis] = await Promise.all([
      getPending({
        page,
        pageSize,
        q: sp.q,
        aging: sp.aging,
        fechaDesde: sp.fechaDesde,
        fechaHasta: sp.fechaHasta,
      }),
      getCapturableDiscountTotal(),
      getDashboardKpis(),
    ]);
    rows = result.rows;
    total = result.total;
    conDescuentoCount = discounts.count;
    portfolioTotal = kpis.cartera_pendiente_total;
    portfolioCount = kpis.cartera_pendiente_count;
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  const detail = sp.factura ? await getPendingByKey(sp.factura) : null;
  const closeParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key !== "factura" && value) closeParams.set(key, value);
  }
  const closeHref = `/cartera/pendiente?${closeParams.toString()}`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Cartera</h1>
        <p className="text-sm text-stone">Cuentas por pagar según el ERP.</p>
      </div>

      <CarteraTabs active="pendiente" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-stone">Total pendiente (portafolio)</p>
          <p className="num mt-2 text-2xl font-bold text-ink">{formatCurrency(portfolioTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-stone">Facturas (portafolio)</p>
          <p className="num mt-2 text-2xl font-bold text-ink">{portfolioCount.toLocaleString("es-CO")}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-stone">Con descuento vigente</p>
          <p className="num mt-2 text-2xl font-bold text-success">{conDescuentoCount}</p>
        </Card>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar la cartera pendiente. Verifica tu conexión y reintenta.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
          <TableToolbar
            searchPlaceholder="Buscar por proveedor o número..."
            filterFields={[
              { name: "aging", label: "Aging", type: "select", options: AGING_OPTIONS },
              { name: "fechaDesde", label: "Vence desde", type: "date" },
              { name: "fechaHasta", label: "Vence hasta", type: "date" },
            ]}
          />

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Wallet size={48} className="text-stone" />
              <p className="text-sm text-stone">Ninguna factura pendiente coincide con estos filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
                  <tr>
                    <th className="px-6 py-3">Proveedor</th>
                    <th className="px-4 py-3">Número</th>
                    <th className="px-4 py-3">Emisión</th>
                    <th className="px-4 py-3">Vencimiento</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-6 py-3">Sincronizado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-l-4 border-line last:border-b-0 hover:bg-cream/30 ${AGING_BORDER[row.aging] ?? ""}`}
                    >
                      <td className="px-6 py-3">
                        <a
                          href={`/cartera/pendiente?${new URLSearchParams({ ...sp, factura: row.invoice_key } as Record<string, string>).toString()}`}
                          className="block font-semibold text-ink hover:text-red"
                        >
                          {row.nombre_proveedor_erp}
                        </a>
                      </td>
                      <td className="num px-4 py-3">{row.num_factura}</td>
                      <td className="date px-4 py-3">{row.fecha_emision_erp ? formatDateEs(row.fecha_emision_erp) : "—"}</td>
                      <td className="date px-4 py-3">{row.fecha_vencimiento_erp ? formatDateEs(row.fecha_vencimiento_erp) : "—"}</td>
                      <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_erp)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.aging} />
                      </td>
                      <td className="date px-6 py-3">{formatDateEs(row.synced_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <TablePagination page={page} pageSize={pageSize} total={total} basePath="/cartera/pendiente" searchParams={sp} />
        </div>
      )}

      <Drawer open={Boolean(detail)} onCloseHref={closeHref} title={detail?.num_factura ?? "Detalle"}>
        {detail && <PendingDetail row={detail} />}
      </Drawer>
    </div>
  );
}
