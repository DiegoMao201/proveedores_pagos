import Link from "next/link";
import { AlertCircle, CheckCircle2, HelpCircle, Inbox, Info, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConciliacionTabs } from "@/components/conciliacion/conciliacion-tabs";
import { CorreoSinErpTable } from "@/components/conciliacion/correo-sin-erp-table";
import { ErpSinCorreoTable } from "@/components/conciliacion/erp-sin-correo-table";
import { ExcluidasTab } from "@/components/conciliacion/excluidas-tab";
import {
  getReconciled,
  getReconciledMercancia,
  getEmailWithoutErp,
  getErpWithoutEmail,
  getEmailWithoutErpMercancia,
  getErpWithoutEmailMercancia,
  getReconciliationKpis,
  getReconciliationKpisMercancia,
  getReconciliationDiffs,
  getHistoricalCutoffs,
  type ConciliacionFilters,
} from "@/lib/conciliacion-data";
import { getDiscountAlerts } from "@/lib/discount-data";
import { getExcludedInvoices } from "@/lib/exclusion-data";
import { formatCurrency, formatCompact, formatDateEs, humanizeProviderName } from "@/lib/format";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const PAGE_SIZE = 100;

const DIFF_LABELS: Record<string, { label: string; tone: string }> = {
  SIN_DIFERENCIA: { label: "Sin diferencia", tone: "var(--color-success)" },
  MENOR: { label: "Menor (<0.5%)", tone: "var(--color-yellow)" },
  MODERADA: { label: "Moderada (0.5-5%)", tone: "var(--color-orange)" },
  CRITICA: { label: "Crítica (>5%)", tone: "var(--color-red-deep)" },
};

export default async function ConciliacionPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab = sp.tab ?? "alertas";
  const soloMercancia = sp.todos !== "1";
  const proveedorFiltro = sp.proveedor?.trim() ?? "";
  const categoriaFiltro = sp.categoria ?? "todas";
  const desdeFiltro = sp.desde ?? "";
  const hastaFiltro = sp.hasta ?? "";
  const filters: ConciliacionFilters = {
    proveedor: proveedorFiltro || undefined,
    categoria: categoriaFiltro,
    desde: desdeFiltro || undefined,
    hasta: hastaFiltro || undefined,
  };
  const hayFiltrosActivos = Boolean(proveedorFiltro || categoriaFiltro !== "todas" || desdeFiltro || hastaFiltro);

  function filterHref(next: Record<string, string>) {
    const params = new URLSearchParams({
      tab,
      ...(soloMercancia ? {} : { todos: "1" }),
      ...(proveedorFiltro ? { proveedor: proveedorFiltro } : {}),
      ...(categoriaFiltro !== "todas" ? { categoria: categoriaFiltro } : {}),
      ...(desdeFiltro ? { desde: desdeFiltro } : {}),
      ...(hastaFiltro ? { hasta: hastaFiltro } : {}),
      ...next,
    });
    return `/conciliacion?${params.toString()}`;
  }

  let dataError: string | null = null;
  let counts = { conciliadas: 0, correoSinErp: 0, erpSinCorreo: 0, alertas: 0 };
  let kpis: {
    conciliadas: number;
    conciliadas_sin_diferencia: number;
    correo_sin_erp: number;
    erp_pendiente_sin_correo: number;
    erp_saldada_sin_correo?: number;
  } = { conciliadas: 0, conciliadas_sin_diferencia: 0, correo_sin_erp: 0, erp_pendiente_sin_correo: 0 };
  let diffs: { categoria: string; n: number }[] = [];
  let alertsTotal = 0;
  let content: React.ReactNode = null;
  let excludedInvoices: Awaited<ReturnType<typeof getExcludedInvoices>> = [];
  let cutoffs: Awaited<ReturnType<typeof getHistoricalCutoffs>> | null = null;

  try {
    const [reconciled, emailWithoutErp, erpWithoutEmail, alerts, kpisResult, diffsResult, excludedResult, cutoffsResult] = await Promise.all([
      soloMercancia
        ? getReconciledMercancia(1, tab === "conciliadas" ? PAGE_SIZE : 1, filters)
        : getReconciled(1, tab === "conciliadas" ? PAGE_SIZE : 1, filters),
      soloMercancia
        ? getEmailWithoutErpMercancia(1, tab === "correo-sin-erp" ? PAGE_SIZE : 1, filters)
        : getEmailWithoutErp(1, tab === "correo-sin-erp" ? PAGE_SIZE : 1, filters),
      soloMercancia
        ? getErpWithoutEmailMercancia(1, tab === "erp-sin-correo" ? PAGE_SIZE : 1, filters)
        : getErpWithoutEmail(1, tab === "erp-sin-correo" ? PAGE_SIZE : 1, filters),
      getDiscountAlerts(5),
      soloMercancia ? getReconciliationKpisMercancia() : getReconciliationKpis(),
      getReconciliationDiffs(),
      getExcludedInvoices(),
      getHistoricalCutoffs(),
    ]);

    counts = {
      conciliadas: reconciled.total,
      correoSinErp: emailWithoutErp.total,
      erpSinCorreo: erpWithoutEmail.total,
      alertas: alerts.length,
    };
    kpis = kpisResult;
    diffs = diffsResult;
    alertsTotal = alerts.reduce((sum, a) => sum + a.ahorro_potencial, 0);
    excludedInvoices = excludedResult;
    cutoffs = cutoffsResult;

    if (tab === "conciliadas") {
      content = (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
              <tr>
                <th className="px-6 py-3">Proveedor</th>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Estado ERP</th>
                <th className="px-4 py-3 text-right">Valor correo</th>
                <th className="px-4 py-3 text-right">Valor ERP</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
                <th className="px-6 py-3">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {reconciled.rows.map((row) => {
                const tone =
                  row.diferencia_valor < 1 ? "success" : row.diferencia_pct < 0.5 ? "warning" : row.diferencia_pct < 5 ? "moderate" : "danger";
                const toneColor =
                  tone === "success" ? "var(--color-success)" : tone === "warning" ? "var(--color-yellow)" : tone === "moderate" ? "var(--color-orange)" : "var(--color-red-deep)";
                return (
                  <tr key={row.invoice_key} className="border-b border-line last:border-0 hover:bg-cream/30">
                    <td className="px-6 py-3 font-semibold text-ink">
                      {row.es_nota_credito && (
                        <span
                          className="mr-1.5 inline-flex items-center rounded-full bg-red-deep px-1.5 py-0.5 font-semibold text-white"
                          style={{ fontSize: 8.5 }}
                        >
                          NC
                        </span>
                      )}
                      {humanizeProviderName(row.nombre_display ?? "")}
                    </td>
                    <td className="num px-4 py-3">{row.num_factura_correo}</td>
                    <td className="px-4 py-3 text-stone" style={{ textTransform: "capitalize" }}>{row.estado_erp}</td>
                    <td
                      className="num px-4 py-3 text-right"
                      style={row.es_nota_credito ? { color: "var(--color-red-deep)", fontWeight: 700 } : undefined}
                    >
                      {row.es_nota_credito ? "−" : ""}
                      {formatCurrency(Math.abs(row.valor_total_correo))}
                    </td>
                    <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_erp)}</td>
                    <td className="num px-4 py-3 text-right">{formatCurrency(row.diferencia_valor)}</td>
                    <td className="px-6 py-3">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: toneColor }}
                        title={`${row.diferencia_pct}% de diferencia`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {reconciled.rows.length === 0 && (
            <EmptyState icon={<CheckCircle2 size={48} />} text="Aún no hay facturas conciliadas para mostrar." />
          )}
        </div>
      );
    } else if (tab === "correo-sin-erp") {
      content = emailWithoutErp.rows.length === 0 ? (
        <EmptyState icon={<Inbox size={48} />} text="Todas las facturas de correo tienen contraparte en el ERP." />
      ) : (
        <CorreoSinErpTable rows={emailWithoutErp.rows} />
      );
    } else if (tab === "erp-sin-correo") {
      content = erpWithoutEmail.rows.length === 0 ? (
        <EmptyState icon={<HelpCircle size={48} />} text="Todas las facturas del ERP tienen su XML recibido por correo." />
      ) : (
        <ErpSinCorreoTable rows={erpWithoutEmail.rows} />
      );
    } else if (tab === "alertas") {
      content = (
        <div className="overflow-x-auto">
          {alerts.length > 0 && (
            <div className="flex items-center justify-between border-b border-line bg-cream-soft" style={{ padding: "10px 14px" }}>
              <p className="text-red-deep" style={{ fontSize: 12, fontWeight: 700 }}>
                Ahorro total en riesgo: {formatCurrency(alertsTotal)}
              </p>
              <button
                className="text-white"
                style={{ background: "var(--color-red-deep)", borderRadius: 8, padding: "8px 14px", fontSize: 11, fontWeight: 800 }}
              >
                Pagar seleccionadas
              </button>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
              <tr>
                <th className="px-6 py-3">Proveedor</th>
                <th className="px-4 py-3">Peldaño</th>
                <th className="px-4 py-3 text-right">Ahorro</th>
                <th className="px-4 py-3">Emitida</th>
                <th className="px-6 py-3">Urgencia</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((row) => (
                <tr key={row.invoice_key} className="border-b border-line last:border-0 hover:bg-cream/30">
                  <td className="px-6 py-3 font-semibold text-ink">{humanizeProviderName(row.nombre_proveedor_erp)}</td>
                  <td className="px-4 py-3 text-stone">{row.peldano_aplicable}</td>
                  <td className="num px-4 py-3 text-right text-success">−{formatCurrency(row.ahorro_potencial)}</td>
                  <td className="date px-4 py-3">{formatDateEs(row.fecha_emision)}</td>
                  <td className="px-6 py-3">
                    <span
                      className="inline-block text-white"
                      style={{
                        borderRadius: 999,
                        padding: "3px 9px",
                        fontSize: 10,
                        fontWeight: 800,
                        background:
                          row.dias_restantes <= 0 ? "var(--color-red-deep)" : row.dias_restantes <= 2 ? "var(--color-red)" : "var(--color-orange)",
                      }}
                    >
                      {row.dias_restantes <= 0 ? "Hoy" : `${row.dias_restantes}d`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {alerts.length === 0 && (
            <EmptyState icon={<CheckCircle2 size={48} />} text="Ningún descuento por pronto pago vence en los próximos 5 días." />
          )}
        </div>
      );
    } else if (tab === "excluidas") {
      content = <ExcluidasTab rows={excludedInvoices} />;
    }
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  const saludPct = kpis.conciliadas + kpis.correo_sin_erp > 0
    ? Math.round((kpis.conciliadas / (kpis.conciliadas + kpis.correo_sin_erp)) * 100)
    : 0;
  const totalDiffs = diffs.reduce((sum, d) => sum + d.n, 0) || 1;
  const criticaCount = diffs.find((d) => d.categoria === "CRITICA")?.n ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
          Conciliación
        </h1>
        <p className="text-stone" style={{ fontSize: 12 }}>
          Cruce entre correo electrónico y cartera del ERP · Salud {saludPct}%
        </p>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar la conciliación. Verifica tu conexión y reintenta.
          </p>
        </Card>
      ) : (
        <>
          {cutoffs && (
            <div
              className="flex items-center gap-2 rounded-md"
              style={{ background: "var(--color-line-soft)", borderLeft: "3px solid var(--color-graphite)", padding: "8px 14px" }}
            >
              <Info size={12} className="text-stone shrink-0" />
              <p className="text-stone" style={{ fontSize: 10 }}>
                Corte histórico activo: facturas desde {formatDateEs(cutoffs.cutoffFacturas)} · NCs de últimos{" "}
                {cutoffs.offsetMesesNcs} meses (desde {formatDateEs(cutoffs.cutoffNcs)}). Documentos anteriores considerados resueltos
                operativamente.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <span className="text-stone" style={{ fontSize: 10 }}>
              {soloMercancia ? "Mostrando solo mercancía (recomendado)" : "Mostrando todos los proveedores"}
            </span>
            <Link
              href={soloMercancia ? filterHref({ todos: "1" }) : filterHref({ todos: "" })}
              className="rounded-full border border-line px-2.5 py-1 font-semibold text-graphite"
              style={{ fontSize: 10 }}
            >
              {soloMercancia ? "Ver todos" : "Ver solo mercancía"}
            </Link>
          </div>
          {!soloMercancia && (
            <p className="text-orange" style={{ fontSize: 10 }}>
              ⚠ Mostrando todos los proveedores. Los conteos incluyen locativos que no van al ERP.
            </p>
          )}

          <Card>
            <form method="GET" className="flex flex-wrap items-end gap-2.5">
              <input type="hidden" name="tab" value={tab} />
              {!soloMercancia && <input type="hidden" name="todos" value="1" />}
              <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                <label className="text-stone" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Proveedor
                </label>
                <div className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1.5">
                  <Search size={13} className="text-stone" />
                  <input
                    type="text"
                    name="proveedor"
                    defaultValue={proveedorFiltro}
                    placeholder="Buscar por nombre…"
                    className="w-full bg-transparent outline-none"
                    style={{ fontSize: 11.5 }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-stone" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Categoría {soloMercancia && "(solo en \"Ver todos\")"}
                </label>
                <select
                  name="categoria"
                  defaultValue={categoriaFiltro}
                  disabled={soloMercancia}
                  className="rounded-md border border-line px-2 py-1.5 disabled:opacity-40"
                  style={{ fontSize: 11.5 }}
                >
                  <option value="todas">Todas</option>
                  <option value="estrategico">Estratégico</option>
                  <option value="locativo">Locativo</option>
                  <option value="institucional">Institucional</option>
                  <option value="operativo">Operativo</option>
                  <option value="esporadico">Esporádico</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-stone" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Emisión desde
                </label>
                <input type="date" name="desde" defaultValue={desdeFiltro} className="rounded-md border border-line px-2 py-1.5" style={{ fontSize: 11.5 }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-stone" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Emisión hasta
                </label>
                <input type="date" name="hasta" defaultValue={hastaFiltro} className="rounded-md border border-line px-2 py-1.5" style={{ fontSize: 11.5 }} />
              </div>
              <button type="submit" className="rounded-md bg-red-deep px-4 py-2 text-white" style={{ fontSize: 11.5, fontWeight: 800 }}>
                Filtrar
              </button>
              {hayFiltrosActivos && (
                <Link
                  href={filterHref({ proveedor: "", categoria: "todas", desde: "", hasta: "" })}
                  className="rounded-md border border-line px-3 py-2 text-graphite"
                  style={{ fontSize: 11.5, fontWeight: 700 }}
                >
                  Limpiar
                </Link>
              )}
            </form>
          </Card>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Link href={filterHref({ tab: "alertas" })}>
              <Card style={{ borderColor: "var(--color-red)", boxShadow: "var(--shadow-glow-red)" }}>
                <p className="text-red-deep" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Accionable hoy
                </p>
                <p className="num text-red-deep" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{counts.alertas}</p>
                <p className="text-ink" style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>Descuentos por perder</p>
                <p className="text-stone" style={{ fontSize: 10 }}>{formatCompact(alertsTotal)} en riesgo · vencen ≤5d</p>
              </Card>
            </Link>
            <Link href={filterHref({ tab: "correo-sin-erp" })}>
              <Card style={{ borderColor: "var(--color-orange)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-orange)" }}>
                  Sin cargar al ERP
                </p>
                <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{counts.correoSinErp.toLocaleString("es-CO")}</p>
                <p className="text-ink" style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>Correo sin ERP</p>
                <p className="text-stone" style={{ fontSize: 10 }}>XML recibido, falta contable</p>
              </Card>
            </Link>
            <Link href={filterHref({ tab: "erp-sin-correo" })}>
              <Card style={{ borderColor: "var(--color-yellow)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-graphite)" }}>
                  XML pendiente
                </p>
                <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{counts.erpSinCorreo.toLocaleString("es-CO")}</p>
                <p className="text-ink" style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>ERP sin correo</p>
                <p className="text-stone" style={{ fontSize: 10 }}>
                  {kpis.erp_saldada_sin_correo != null
                    ? `${kpis.erp_pendiente_sin_correo} pend. · ${kpis.erp_saldada_sin_correo} sald.`
                    : "Solo pendientes (saldadas ya no cuentan)"}
                </p>
              </Card>
            </Link>
            <Link href={filterHref({ tab: "conciliadas" })}>
              <Card style={{ borderColor: "var(--color-success)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-success)" }}>
                  En orden
                </p>
                <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{kpis.conciliadas.toLocaleString("es-CO")}</p>
                <p className="text-ink" style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>Conciliadas</p>
                <p className="text-stone" style={{ fontSize: 10 }}>{kpis.conciliadas_sin_diferencia} sin diferencia</p>
              </Card>
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
            <ConciliacionTabs
              active={tab}
              makeHref={(k) => filterHref({ tab: k })}
              tabs={[
                { key: "alertas", label: "Descuentos por perder", count: counts.alertas },
                { key: "correo-sin-erp", label: "Correo sin ERP", count: counts.correoSinErp },
                { key: "erp-sin-correo", label: "ERP sin correo", count: counts.erpSinCorreo },
                { key: "conciliadas", label: "Conciliadas", count: counts.conciliadas },
                { key: "excluidas", label: "Excluidas", count: excludedInvoices.length },
              ]}
            />
            {content}
          </div>

          <Card>
            <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 13 }}>
              Diferencias detectadas en conciliadas
            </h2>
            <p className="text-stone" style={{ fontSize: 10, marginBottom: 10 }}>
              {kpis.conciliadas.toLocaleString("es-CO")} conciliadas · {totalDiffs - (diffs.find((d) => d.categoria === "SIN_DIFERENCIA")?.n ?? 0)} con diferencia
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["SIN_DIFERENCIA", "MENOR", "MODERADA", "CRITICA"] as const).map((cat) => {
                const row = diffs.find((d) => d.categoria === cat);
                const info = DIFF_LABELS[cat];
                return (
                  <div key={cat} className="rounded-md" style={{ padding: 10, backgroundColor: `color-mix(in srgb, ${info.tone} 12%, var(--color-parchment))` }}>
                    <p className="num" style={{ fontWeight: 800, fontSize: 18, color: info.tone }}>{row?.n ?? 0}</p>
                    <p className="text-graphite" style={{ fontSize: 10 }}>{info.label}</p>
                  </div>
                );
              })}
            </div>
            {criticaCount > 0 && (
              <p className="text-red-deep" style={{ fontSize: 11, marginTop: 10 }}>
                <strong>Detectado:</strong> {criticaCount} caso(s) crítico(s) con diferencia &gt;5% — probablemente por notas crédito no aplicadas.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-stone">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}
