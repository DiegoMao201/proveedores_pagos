import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { RebateTabs } from "@/components/layout/rebate-tabs";
import { PeriodProgressGrid } from "@/components/rebate/period-progress";
import { ScalePill } from "@/components/rebate/scale-pill";
import { AbracolSimulator } from "@/components/rebate/simulator";
import { formatCompact, formatDateEs } from "@/lib/format";
import { getAbracolBimester } from "@/lib/rebate-data";

export const revalidate = 300;

export default async function RebateAbracolPage() {
  let error: string | null = null;
  let bimestres: Awaited<ReturnType<typeof getAbracolBimester>> = [];

  try {
    bimestres = await getAbracolBimester();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido";
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Rebate Abracol</h1>
        </div>
        <RebateTabs active="abracol" />
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar el motor de rebate Abracol. {error}
          </p>
        </Card>
      </div>
    );
  }

  const current = bimestres.find((b) => b.estado_periodo === "ABIERTO") ?? bimestres[bimestres.length - 1];
  const ventasAcumuladas = bimestres.reduce((acc, b) => acc + b.venta_lograda, 0);
  const metaTotal = bimestres.reduce((acc, b) => acc + b.meta_2026, 0);
  const rebateTotal = bimestres.reduce((acc, b) => acc + b.rebate_actual, 0);
  const rebateBloqueado = bimestres.reduce((acc, b) => acc + b.rebate_bloqueado, 0);
  const pendienteTotal = bimestres.reduce((acc, b) => acc + b.valor_pendiente, 0);

  const periodCards = bimestres.map((b) => ({
    title: b.periodo.replace("BIMESTRE", "Bimestre"),
    ganado: b.rebate_actual,
    reason: `Cumplió ${b.pct_cumplimiento ?? 0}% de la meta (${formatCompact(b.meta_2026)}), creciendo ${b.pct_crecimiento_vs_2025 ?? 0}% vs 2025.`,
    progressPct: b.pct_cumplimiento ?? 0,
    status: b.estado_periodo,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontWeight: 800, fontSize: 19 }}>
          Rebate Abracol
        </h1>
        <p className="text-stone" style={{ fontSize: 11 }}>
          Ciclo anual 2026 · seguimiento bimestral del rebate Gold, cruce de correo y ERP.
        </p>
      </div>

      <RebateTabs active="abracol" />

      <Card className="bg-parchment">
        <p className="text-graphite" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
          Reglas comerciales activas
        </p>
        <ul className="text-stone" style={{ fontSize: 10.5, lineHeight: 1.7 }}>
          <li>1. Abracol liquida 6,0% por bimestre sobre venta neta facturada (sin escalas).</li>
          <li>2. La nota se reconoce antes de IVA; se muestra rebate bruto, IVA estimado y total con IVA.</li>
          <li>3. La cuota comercial 2026 se compara contra la meta bimestral definida por Ferreinox, solo para seguimiento.</li>
          <li>4. Notas crédito se restan de la venta lograda de cada bimestre.</li>
        </ul>
      </Card>

      <div>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
          Ganado por bimestre
        </h2>
        <PeriodProgressGrid items={periodCards} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KPICard
          label="Ventas 2026 facturadas"
          value={formatCompact(ventasAcumuladas)}
          tone="info"
          trend={{ direction: "up", label: `Cumplimiento anual: ${metaTotal > 0 ? Math.round((ventasAcumuladas / metaTotal) * 100) : 0}%` }}
        />
        <KPICard
          label={`Bimestre actual (${current?.periodo ?? "—"})`}
          value={formatCompact(current?.venta_lograda ?? 0)}
          tone="success"
          trend={{ direction: "up", label: `Cumplimiento meta: ${current?.pct_cumplimiento ?? 0}%` }}
        />
        <KPICard
          label="Rebate bruto estimado"
          value={formatCompact(rebateTotal)}
          tone="success"
          trend={{ direction: "up", label: "Abracol 6,0% antes de IVA" }}
        />
        <KPICard
          label="Rebate bloqueado cartera"
          value={formatCompact(rebateBloqueado)}
          tone="yellow"
          trend={{ direction: rebateBloqueado > 0 ? "down" : "up", label: `Pendiente cartera: ${formatCompact(pendienteTotal)}` }}
        />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
          <h2 className="text-graphite" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Seguimiento bimestral
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 11 }}>
            <thead>
              <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th className="px-3 py-2 text-left">Bimestre</th>
                <th className="px-3 py-2 text-left">Vigencia</th>
                <th className="px-3 py-2 text-right">Ventas 2025</th>
                <th className="px-3 py-2 text-right">Meta 2026</th>
                <th className="px-3 py-2 text-right">Ventas actuales</th>
                <th className="px-3 py-2 text-right">Rebate</th>
                <th className="px-3 py-2 text-right">Total c/IVA</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {bimestres.map((b) => (
                <tr key={b.periodo} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink">{b.periodo.replace("BIMESTRE", "Bimestre")}</td>
                  <td className="px-3 py-2 text-stone">
                    {formatDateEs(b.inicio)} – {formatDateEs(b.fin)}
                  </td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(b.ventas_2025)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(b.meta_2026)}</td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(b.venta_lograda)}</td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(b.rebate_actual)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(b.total_actual)}</td>
                  <td className="px-3 py-2">
                    <ScalePill value={b.estado_periodo} />
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
          Abracol se liquida contra su cuota bimestral a una tasa plana de 6,0%, sin escalas: la meta solo sirve de
          referencia de cumplimiento, el rebate se paga sobre toda la venta facturada del periodo. El bloqueado por
          cartera es informativo — muestra cuánto de ese rebate corresponde a facturas todavía pendientes de pago —
          y no reduce el rebate bruto reportado.
        </p>
      </Card>

      {current && <AbracolSimulator metaBimestre={current.meta_2026} />}
    </div>
  );
}
