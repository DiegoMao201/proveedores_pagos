import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { RebateTabs } from "@/components/layout/rebate-tabs";
import { PeriodProgressGrid } from "@/components/rebate/period-progress";
import { ScalePill } from "@/components/rebate/scale-pill";
import { SectionTabs } from "@/components/rebate/section-tabs";
import { StackedBarChart } from "@/components/rebate/stacked-bar-chart";
import { InvoiceTable } from "@/components/rebate/invoice-table";
import { PintucoSimulator } from "@/components/rebate/simulator";
import { formatCompact, formatDateEs } from "@/lib/format";
import {
  getPintucoMonthly,
  getPintucoQuarterly,
  getPintucoSeasonality,
  getPintucoRecomposition,
  getPintucoInvoices,
} from "@/lib/rebate-data";

export const revalidate = 300;

function currentMonthNum(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", month: "numeric" }).format(new Date()));
}

export default async function RebatePintucoPage() {
  let error: string | null = null;
  let monthly: Awaited<ReturnType<typeof getPintucoMonthly>> = [];
  let quarterly: Awaited<ReturnType<typeof getPintucoQuarterly>> = [];
  let seasonality: Awaited<ReturnType<typeof getPintucoSeasonality>> = [];
  let recomposition: Awaited<ReturnType<typeof getPintucoRecomposition>> = null;
  let invoices: Awaited<ReturnType<typeof getPintucoInvoices>> = [];

  try {
    [monthly, quarterly, seasonality, recomposition, invoices] = await Promise.all([
      getPintucoMonthly(),
      getPintucoQuarterly(),
      getPintucoSeasonality(),
      getPintucoRecomposition(),
      getPintucoInvoices(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido";
  }

  if (error || !recomposition) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Rebate Pintuco</h1>
        </div>
        <RebateTabs active="pintuco" />
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar el motor de rebate Pintuco. {error}
          </p>
        </Card>
      </div>
    );
  }

  const rebateMensual = monthly.reduce((acc, m) => acc + m.rebate_mensual_ganado, 0);
  const rebateTrimestral = quarterly.reduce((acc, q) => acc + q.rebate_trimestral_ganado, 0);
  const rebateEstacionalidad = seasonality.reduce((acc, s) => acc + (s.bono_aplica ? s.bono_valor : 0), 0);
  const rebateGanadoHoy = rebateMensual + rebateTrimestral + rebateEstacionalidad;

  const mesActual = currentMonthNum();
  const currentMonth = monthly.find((m) => m.mes_num === mesActual) ?? monthly[monthly.length - 1];
  const currentQuarter = quarterly.find((q) => q.trimestre === currentMonth?.trimestre) ?? quarterly[quarterly.length - 1];
  const currentSeasonality = seasonality.find((s) => s.mes_num === mesActual) ?? seasonality[seasonality.length - 1];

  const faltanteE2Ciclo = Math.max(recomposition.meta_ciclo_e2 - recomposition.compra_aplicable_acumulada, 0);
  const faltanteE2Trimestre = currentQuarter ? Math.max(currentQuarter.meta_trimestre_e2 - currentQuarter.venta_lograda_trimestre, 0) : 0;

  const quarterCards = quarterly.map((q) => ({
    title: q.trimestre,
    ganado: q.rebate_trimestral_ganado,
    reason: `Compra aplicable cubrió ${q.pct_a_e2_trimestre ?? 0}% de la meta Escala 2 (${formatCompact(q.meta_trimestre_e2)}).`,
    progressPct: q.pct_a_e2_trimestre ?? 0,
    status: q.escala_lograda_trimestre,
  }));

  const direccionTab = (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KPICard
          label="Compra aplicable acumulada"
          value={formatCompact(recomposition.compra_aplicable_acumulada)}
          tone="info"
          trend={{ direction: "up", label: `Cumplimiento E2: ${recomposition.pct_acumulado_e2 ?? 0}%` }}
        />
        <KPICard
          label="Escala actual del ciclo"
          value={recomposition.escala_ciclo === "SIN_ESCALA" ? "Sin escala" : recomposition.escala_ciclo.replace("_", " ")}
          tone={recomposition.escala_ciclo === "SIN_ESCALA" ? "orange" : "success"}
          trend={{
            direction: faltanteE2Ciclo > 0 ? "down" : "up",
            label: faltanteE2Ciclo > 0 ? `Faltante a E2: ${formatCompact(faltanteE2Ciclo)}` : "Meta E2 alcanzada",
          }}
        />
        <KPICard
          label="Rebate ganado a hoy"
          value={formatCompact(rebateGanadoHoy)}
          tone="success"
          trend={{ direction: "up", label: "Mensual + trimestral + estacionalidad" }}
        />
        <KPICard
          label="Bolsa 9M proyectada"
          value={formatCompact(recomposition.recomposicion_9m_proyectada)}
          tone="yellow"
          trend={{
            direction: recomposition.recomposicion_9m_bloqueada > 0 ? "down" : "up",
            label: `Bloqueada por cartera: ${formatCompact(recomposition.recomposicion_9m_bloqueada)}`,
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KPICard
          label={`Mes actual (${currentMonth?.mes ?? "—"})`}
          value={formatCompact(currentMonth?.venta_lograda ?? 0)}
          tone="info"
          trend={{ direction: "up", label: `Escala ${currentMonth?.escala_lograda === "SIN_ESCALA" ? "sin escala" : currentMonth?.escala_lograda}` }}
        />
        <KPICard
          label="Estacionalidad"
          value={currentSeasonality?.bono_aplica ? "En ventana" : "No aplica"}
          tone={currentSeasonality?.bono_aplica ? "success" : "orange"}
          trend={{
            direction: currentSeasonality?.bono_aplica ? "up" : "down",
            label: `Corte ${currentSeasonality ? formatDateEs(currentSeasonality.corte_estacionalidad) : "—"}, bono ${formatCompact(currentSeasonality?.bono_valor ?? 0)}`,
          }}
        />
        <KPICard
          label={`Trimestre actual (${currentQuarter?.trimestre ?? "—"})`}
          value={currentQuarter?.escala_lograda_trimestre === "SIN_ESCALA" ? "Sin escala" : currentQuarter?.escala_lograda_trimestre ?? "—"}
          tone={currentQuarter?.escala_lograda_trimestre === "SIN_ESCALA" ? "orange" : "success"}
          trend={{ direction: "down", label: `Faltante E2: ${formatCompact(faltanteE2Trimestre)}` }}
        />
        <KPICard
          label="Recomposición trimestral"
          value={formatCompact(currentQuarter?.recomposicion_trimestral_recuperable ?? 0)}
          tone="yellow"
          trend={{
            direction: (currentQuarter?.recomposicion_trimestral_bloqueada ?? 0) > 0 ? "down" : "up",
            label: `Bloqueada cartera: ${formatCompact(currentQuarter?.recomposicion_trimestral_bloqueada ?? 0)}`,
          }}
        />
      </div>

      <Card>
        <p className="text-graphite" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
          Lectura ejecutiva
        </p>
        <p className="text-stone" style={{ fontSize: 10.5, lineHeight: 1.6 }}>
          El motor compara cada mes contra las escalas 1 y 1,5%, cada trimestre contra 1% y 2,5%, y evalúa la
          estacionalidad al corte configurado. La recomposición a 9 meses recupera, para los meses ya transcurridos, la
          diferencia entre la tasa que pagaría hoy el ciclo acumulado y la tasa que cada mes ya ganó individualmente —
          con un descuento fijo del 85% sobre el saldo elegible. Cualquier mes con cartera pendiente en el ERP queda
          fuera del cálculo elegible y se muestra como bloqueado, sin proporcionalidad ni umbral de días.
        </p>
      </Card>
    </div>
  );

  const mesAMesTab = (
    <div className="flex flex-col gap-3">
      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
          <h2 className="text-graphite" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Resumen ejecutivo del ciclo
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 11 }}>
            <thead>
              <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th className="px-3 py-2 text-left">Mes</th>
                <th className="px-3 py-2 text-left">Trim.</th>
                <th className="px-3 py-2 text-right">Compra neta</th>
                <th className="px-3 py-2 text-right">10% excluido</th>
                <th className="px-3 py-2 text-right">90% aplicable</th>
                <th className="px-3 py-2 text-right">Meta E1</th>
                <th className="px-3 py-2 text-right">Meta E2</th>
                <th className="px-3 py-2 text-right">Faltante E1</th>
                <th className="px-3 py-2 text-right">Faltante E2</th>
                <th className="px-3 py-2 text-left">Escala</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-right">Rebate mensual</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.mes} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink">{m.mes}</td>
                  <td className="px-3 py-2 text-stone">{m.trimestre}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(m.compra_neta)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(m.excluido_10)}</td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(m.venta_lograda)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(m.escala_1)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(m.escala_2)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(m.faltante_escala_1)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(m.faltante_escala_2)}</td>
                  <td className="px-3 py-2">
                    <ScalePill value={m.escala_lograda} />
                  </td>
                  <td className="px-3 py-2">
                    <ScalePill value={m.cartera_riesgo ? "NO_CUMPLIDO" : m.estado_mes} />
                  </td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(m.rebate_mensual_ganado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12, marginBottom: 2 }}>
          Compra neta por mes
        </h2>
        <p className="text-stone" style={{ fontSize: 10, marginBottom: 10 }}>
          90% aplicable al rebate (rojo) vs. 10% excluido (gris).
        </p>
        <StackedBarChart
          series={[
            { key: "aplicable", label: "90% aplicable", color: "var(--color-red)" },
            { key: "excluido", label: "10% excluido", color: "var(--color-line)" },
          ]}
          data={monthly.map((m) => ({
            category: m.mes.slice(0, 3),
            values: { aplicable: m.venta_lograda, excluido: m.excluido_10 },
          }))}
        />
      </Card>
    </div>
  );

  const trimestreTab = (
    <div className="flex flex-col gap-3">
      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
          <h2 className="text-graphite" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Cumplimiento trimestral y recuperación
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 11 }}>
            <thead>
              <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th className="px-3 py-2 text-left">Trimestre</th>
                <th className="px-3 py-2 text-right">Compra aplicable</th>
                <th className="px-3 py-2 text-right">Meta E1</th>
                <th className="px-3 py-2 text-right">Meta E2</th>
                <th className="px-3 py-2 text-right">Faltante E1</th>
                <th className="px-3 py-2 text-right">Faltante E2</th>
                <th className="px-3 py-2 text-left">Escala</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-right">% Rebate</th>
                <th className="px-3 py-2 text-right">Rebate ganado</th>
                <th className="px-3 py-2 text-right">Recup. cartera al día</th>
                <th className="px-3 py-2 text-right">Bloqueado cartera</th>
              </tr>
            </thead>
            <tbody>
              {quarterly.map((q) => (
                <tr key={q.trimestre} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink">{q.trimestre}</td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(q.venta_lograda_trimestre)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(q.meta_trimestre_e1)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(q.meta_trimestre_e2)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(q.faltante_e1_trimestre)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(q.faltante_e2_trimestre)}</td>
                  <td className="px-3 py-2">
                    <ScalePill value={q.escala_lograda_trimestre} />
                  </td>
                  <td className="px-3 py-2">
                    <ScalePill value={q.estado_trimestre} />
                  </td>
                  <td className="num px-3 py-2 text-right text-stone">{(q.rebate_trimestral_pct * 100).toFixed(1)}%</td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(q.rebate_trimestral_ganado)}</td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(q.recomposicion_trimestral_recuperable)}</td>
                  <td className="num px-3 py-2 text-right text-orange">{formatCompact(q.recomposicion_trimestral_bloqueada)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12, marginBottom: 10 }}>
          Composición del rebate por trimestre
        </h2>
        <StackedBarChart
          series={[
            { key: "ganado", label: "Rebate trimestral ganado", color: "var(--color-red-deep)" },
            { key: "recuperable", label: "Recomposición recuperable", color: "var(--color-red)" },
            { key: "bloqueada", label: "Recomposición bloqueada por cartera", color: "var(--color-line)" },
          ]}
          data={quarterly.map((q) => ({
            category: q.trimestre,
            values: {
              ganado: q.rebate_trimestral_ganado,
              recuperable: q.recomposicion_trimestral_recuperable,
              bloqueada: q.recomposicion_trimestral_bloqueada,
            },
          }))}
        />
      </Card>

      <Card>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>
          Recomposición 9 meses (ciclo completo)
        </h2>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <KPICard
            label="Meta ciclo E2"
            value={formatCompact(recomposition.meta_ciclo_e2)}
            tone="info"
            trend={{ direction: "up", label: `Acumulado hoy: ${recomposition.pct_acumulado_e2 ?? 0}%` }}
          />
          <KPICard
            label="Recuperable (85% del elegible)"
            value={formatCompact(recomposition.recomposicion_9m_proyectada)}
            tone="success"
            trend={{ direction: "up", label: "Sin cartera pendiente en el mes" }}
          />
          <KPICard
            label="Bloqueada por cartera"
            value={formatCompact(recomposition.recomposicion_9m_bloqueada)}
            tone="yellow"
            trend={{ direction: recomposition.recomposicion_9m_bloqueada > 0 ? "down" : "up", label: "Bloqueo binario, sin proporcionalidad" }}
          />
          <KPICard
            label="Días restantes del ciclo"
            value={`${recomposition.dias_restantes_ciclo} días`}
            tone="orange"
            trend={{
              direction: "down",
              label: `Ritmo requerido: ${formatCompact(recomposition.ritmo_diario_requerido ?? 0)}/día`,
            }}
          />
        </div>
      </Card>
    </div>
  );

  const estacionalidadTab = (
    <Card className="!p-0 overflow-hidden">
      <div className="border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
        <h2 className="text-graphite" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Estacionalidad por mes
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: 11 }}>
          <thead>
            <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th className="px-3 py-2 text-left">Mes</th>
              <th className="px-3 py-2 text-left">Corte</th>
              <th className="px-3 py-2 text-right">Venta pre-corte</th>
              <th className="px-3 py-2 text-right">Meta Escala 2</th>
              <th className="px-3 py-2 text-right">% pre-corte</th>
              <th className="px-3 py-2 text-left">Bono aplica</th>
              <th className="px-3 py-2 text-right">Bono (1,0%)</th>
            </tr>
          </thead>
          <tbody>
            {seasonality.map((s) => (
              <tr key={s.mes} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-semibold text-ink">{s.mes}</td>
                <td className="px-3 py-2 text-stone">{formatDateEs(s.corte_estacionalidad)}</td>
                <td className="num px-3 py-2 text-right text-ink">{formatCompact(s.venta_pre_corte)}</td>
                <td className="num px-3 py-2 text-right text-stone">{formatCompact(s.escala_2)}</td>
                <td className="num px-3 py-2 text-right text-stone">{s.pct_pre_corte ?? 0}%</td>
                <td className="px-3 py-2">
                  <ScalePill value={s.bono_aplica ? "CUMPLIDO" : "SIN_ESCALA"} />
                </td>
                <td className="num px-3 py-2 text-right text-ink">{formatCompact(s.bono_valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontWeight: 800, fontSize: 19 }}>
          Rebate Pintuco
        </h1>
        <p className="text-stone" style={{ fontSize: 11 }}>
          Ciclo abril–diciembre 2026 · seguimiento mensual, trimestral y estacionalidad, con recomposición a 9 meses.
        </p>
      </div>

      <RebateTabs active="pintuco" />

      <Card className="bg-parchment">
        <p className="text-graphite" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
          Reglas comerciales activas
        </p>
        <ul className="text-stone" style={{ fontSize: 10.5, lineHeight: 1.7 }}>
          <li>1. La base del cálculo es la compra neta menos el 10% excluido; el rebate corre sobre el 90%.</li>
          <li>2. Cada mes compara contra Escala 1 (1,0%) y Escala 2 (1,5%); el trimestre contra 1,0% y 2,5%.</li>
          <li>
            3. Estacionalidad: si al cierre del corte del mes (
            {currentSeasonality ? formatDateEs(currentSeasonality.corte_estacionalidad) : "—"}) se alcanza el 90% de
            Escala 2, se gana un bono adicional de 1,0%.
          </li>
          <li>4. La recomposición separa el saldo elegible del saldo bloqueado por cartera (85% del elegible, a 9 meses).</li>
          <li>5. Notas crédito se restan de la venta lograda de cada mes.</li>
        </ul>
      </Card>

      <div>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
          Ganado por trimestre
        </h2>
        <PeriodProgressGrid items={quarterCards} />
      </div>

      <SectionTabs
        tabs={[
          { key: "direccion", label: "Dirección", content: direccionTab },
          { key: "mes-a-mes", label: "Mes a mes", content: mesAMesTab },
          { key: "trimestre", label: "Trimestre y recomposición", content: trimestreTab },
          { key: "estacionalidad", label: "Estacionalidad", content: estacionalidadTab },
          { key: "facturas", label: "Facturas y fuente", content: <InvoiceTable rows={invoices} limit={150} /> },
        ]}
      />

      {currentMonth && currentQuarter && (
        <PintucoSimulator
          escalaMensual1={currentMonth.escala_1}
          escalaMensual2={currentMonth.escala_2}
          escalaTrimestral1={currentQuarter.meta_trimestre_e1}
          escalaTrimestral2={currentQuarter.meta_trimestre_e2}
          ventaAcumuladaTrimestre={currentQuarter.venta_lograda_trimestre - currentMonth.venta_lograda}
        />
      )}
    </div>
  );
}
