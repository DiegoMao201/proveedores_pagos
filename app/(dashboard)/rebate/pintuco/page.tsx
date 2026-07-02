import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { RebateTabs } from "@/components/layout/rebate-tabs";
import { PeriodProgressGrid } from "@/components/rebate/period-progress";
import { ScalePill } from "@/components/rebate/scale-pill";
import { PintucoSimulator } from "@/components/rebate/simulator";
import { formatCompact, formatDateEs } from "@/lib/format";
import {
  getPintucoMonthly,
  getPintucoQuarterly,
  getPintucoSeasonality,
  getPintucoRecomposition,
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

  try {
    [monthly, quarterly, seasonality, recomposition] = await Promise.all([
      getPintucoMonthly(),
      getPintucoQuarterly(),
      getPintucoSeasonality(),
      getPintucoRecomposition(),
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
          <li>1. La base del cálculo es la compra neta menos el 12% excluido; el rebate corre sobre el 88%.</li>
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

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
          <h2 className="text-graphite" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Mes a mes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 11 }}>
            <thead>
              <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th className="px-3 py-2 text-left">Mes</th>
                <th className="px-3 py-2 text-right">Compra aplicable</th>
                <th className="px-3 py-2 text-right">% a Escala 2</th>
                <th className="px-3 py-2 text-left">Escala</th>
                <th className="px-3 py-2 text-right">Rebate mensual</th>
                <th className="px-3 py-2 text-left">Cartera</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.mes} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink">{m.mes}</td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(m.venta_lograda)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{m.pct_a_escala_2 ?? 0}%</td>
                  <td className="px-3 py-2">
                    <ScalePill value={m.escala_lograda} />
                  </td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(m.rebate_mensual_ganado)}</td>
                  <td className="px-3 py-2">
                    {m.cartera_riesgo ? <ScalePill value="NO_CUMPLIDO" /> : <span className="text-stone">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
