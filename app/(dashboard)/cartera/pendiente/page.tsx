import { AlertCircle, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { TablePagination } from "@/components/data-table/table-pagination";
import { PendingDetail } from "@/components/cartera/pending-detail";
import { AgingPanel } from "@/components/cartera/aging-panel";
import { ConcentrationBars } from "@/components/cartera/concentration-bars";
import { CashflowBars } from "@/components/cartera/cashflow-bars";
import { getPending, getPendingByKey, type ErpPending } from "@/lib/cartera-data";
import { getCapturableDiscountTotal, getPendingAging } from "@/lib/dashboard-data";
import {
  getPendingKpis,
  getProviderConcentration,
  getProviderConcentrationCount,
  getCashflowWeekly,
} from "@/lib/cartera-portfolio-data";
import { CarteraTabs } from "@/components/cartera/cartera-tabs";
import { formatCurrency, formatCompact, formatDateEs, humanizeProviderName } from "@/lib/format";

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
  let capturableTotal = 0;
  let kpis = { total_pendiente: 0, facturas_total: 0, vencidas_valor: 0, vencidas_count: 0, semana_valor: 0, semana_count: 0 };
  let aging: Awaited<ReturnType<typeof getPendingAging>> | null = null;
  let concentration: Awaited<ReturnType<typeof getProviderConcentration>> = [];
  let concentrationCount = 0;
  let cashflow: Awaited<ReturnType<typeof getCashflowWeekly>> = [];

  try {
    const [result, discounts, kpisResult, agingResult, concentrationResult, concentrationCountResult, cashflowResult] = await Promise.all([
      getPending({ page, pageSize, q: sp.q, aging: sp.aging, fechaDesde: sp.fechaDesde, fechaHasta: sp.fechaHasta }),
      getCapturableDiscountTotal(),
      getPendingKpis(),
      getPendingAging(),
      getProviderConcentration(5),
      getProviderConcentrationCount(),
      getCashflowWeekly(),
    ]);
    rows = result.rows;
    total = result.total;
    conDescuentoCount = discounts.count;
    capturableTotal = discounts.total;
    kpis = kpisResult;
    aging = agingResult;
    concentration = concentrationResult;
    concentrationCount = concentrationCountResult;
    cashflow = cashflowResult;
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  const detail = sp.factura ? await getPendingByKey(sp.factura) : null;
  const closeParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key !== "factura" && value) closeParams.set(key, value);
  }
  const closeHref = `/cartera/pendiente?${closeParams.toString()}`;
  const pctVencidas = kpis.total_pendiente ? Math.round((kpis.vencidas_valor / kpis.total_pendiente) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
          Cartera del portafolio
        </h1>
        <p className="text-stone" style={{ fontSize: 12 }}>
          Cuentas por pagar según el ERP · {concentrationCount} proveedores activos
        </p>
      </div>

      <CarteraTabs active="pendiente" />

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar la cartera pendiente. Verifica tu conexión y reintenta.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Card>
              <p className="text-stone" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Total pendiente
              </p>
              <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{formatCompact(kpis.total_pendiente)}</p>
              <p className="text-stone" style={{ fontSize: 10, marginTop: 2 }}>{kpis.facturas_total} facturas</p>
            </Card>
            <Card style={{ borderColor: "var(--color-red)" }}>
              <p className="text-red-deep" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Vencidas
              </p>
              <p className="num text-red-deep" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{formatCompact(kpis.vencidas_valor)}</p>
              <p className="text-stone" style={{ fontSize: 10, marginTop: 2 }}>{kpis.vencidas_count} facturas · {pctVencidas}%</p>
            </Card>
            <Card style={{ borderColor: "var(--color-orange)" }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-orange)" }}>
                Esta semana
              </p>
              <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{formatCompact(kpis.semana_valor)}</p>
              <p className="text-stone" style={{ fontSize: 10, marginTop: 2 }}>{kpis.semana_count} facturas</p>
            </Card>
            <Card className="bg-cream-soft" style={{ borderColor: "var(--color-yellow)" }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-graphite)" }}>
                Con dcto vigente
              </p>
              <p className="num text-red-deep" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{conDescuentoCount} fact.</p>
              <p className="text-stone" style={{ fontSize: 10, marginTop: 2 }}>{formatCompact(capturableTotal)} capturable</p>
            </Card>
          </div>

          {aging && <AgingPanel totals={aging} />}

          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            <Card>
              <ConcentrationBars rows={concentration} totalProviders={concentrationCount} />
            </Card>
            <Card>
              <CashflowBars rows={cashflow} />
            </Card>
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
        <div className="flex items-center justify-between border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
          <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12 }}>
            Facturas pendientes · ordenadas por urgencia
          </h2>
        </div>
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
                        {humanizeProviderName(row.nombre_proveedor_erp)}
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

      <Drawer open={Boolean(detail)} onCloseHref={closeHref} title={detail?.num_factura ?? "Detalle"}>
        {detail && <PendingDetail row={detail} />}
      </Drawer>
    </div>
  );
}
