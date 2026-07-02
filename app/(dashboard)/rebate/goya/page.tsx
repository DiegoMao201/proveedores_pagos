import { AlertCircle, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { RebateTabs } from "@/components/layout/rebate-tabs";
import { PeriodProgressGrid } from "@/components/rebate/period-progress";
import { ScalePill } from "@/components/rebate/scale-pill";
import { GoyaSimulator } from "@/components/rebate/simulator";
import { formatCompact, formatDateEs } from "@/lib/format";
import { getGoyaSemester } from "@/lib/rebate-data";

export const revalidate = 300;

export default async function RebateGoyaPage() {
  let error: string | null = null;
  let semestres: Awaited<ReturnType<typeof getGoyaSemester>> = [];

  try {
    semestres = await getGoyaSemester();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido";
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Rebate Goya</h1>
        </div>
        <RebateTabs active="goya" />
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar el motor de rebate Goya. {error}
          </p>
        </Card>
      </div>
    );
  }

  const current = semestres.find((s) => s.estado_periodo === "ABIERTO") ?? semestres[semestres.length - 1];
  const ventasAcumuladas = semestres.reduce((acc, s) => acc + s.venta_lograda, 0);
  const baseTotal = semestres.reduce((acc, s) => acc + s.base_2025, 0);
  const rebateTotal = semestres.reduce((acc, s) => acc + s.rebate_ganado, 0);
  const rebateBloqueadoCartera = semestres.filter((s) => s.cartera_vencida).reduce((acc, s) => acc + s.rebate_pre_gate, 0);

  const periodCards = semestres.map((s) => ({
    title: s.periodo.replace("SEMESTRE", "Semestre"),
    ganado: s.rebate_ganado,
    reason: `Creció ${s.pct_crecimiento ?? 0}% frente a la base 2025, alcanzando la escala ${
      s.escala_lograda === "SIN_ESCALA" ? "sin escala" : s.escala_lograda.replace("ESCALA_", "") + "%"
    } y liquidando ${(s.tasa_rebate * 100).toFixed(1)}% de rebate.${s.cartera_vencida ? " Bloqueado por cartera vencida." : ""}`,
    progressPct: Math.max(0, Math.min(100, ((s.pct_crecimiento ?? 0) / 50) * 100)),
    status: s.cartera_vencida ? "NO_CUMPLIDO" : s.escala_lograda,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontWeight: 800, fontSize: 19 }}>
          Rebate Goya
        </h1>
        <p className="text-stone" style={{ fontSize: 11 }}>
          Ciclo anual 2026 · seguimiento semestral del crecimiento contra base 2025, liquidación por escalas.
        </p>
      </div>

      <RebateTabs active="goya" />

      <Card className="bg-parchment">
        <p className="text-graphite" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
          Reglas comerciales activas
        </p>
        <ul className="text-stone" style={{ fontSize: 10.5, lineHeight: 1.7 }}>
          <li>1. Goya liquida rebate por semestre (enero–junio y julio–diciembre) contra la venta 2025 del semestre.</li>
          <li>2. Escalas de crecimiento: 20% / 30% / 40% / 50%, con tasas de rebate 2,0% / 2,5% / 3,5% / 4,0%.</li>
          <li>3. Se calcula sobre compras reales facturadas, restando notas crédito del periodo.</li>
          <li>
            4. Cláusula contractual "cliente sin cartera vencida": si existe cartera vencida real de Goya en el ERP,
            el rebate del periodo se bloquea por completo (gate binario, no proporcional).
          </li>
        </ul>
      </Card>

      {current?.cartera_vencida && (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <ShieldAlert size={16} />
            Rebate bloqueado: cartera vencida de {formatCompact(current.valor_cartera_vencida)} en el ERP para Goya.
            Se liquidaría {formatCompact(current.rebate_pre_gate)} sin esta condición contractual.
          </p>
        </Card>
      )}

      <div>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
          Ganado por semestre
        </h2>
        <PeriodProgressGrid items={periodCards} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KPICard
          label="Ventas 2026 facturadas"
          value={formatCompact(ventasAcumuladas)}
          tone="info"
          trend={{ direction: "up", label: `Crecimiento consolidado: ${baseTotal > 0 ? Math.round((ventasAcumuladas / baseTotal - 1) * 100) : 0}%` }}
        />
        <KPICard
          label={`Semestre actual (${current?.periodo ?? "—"})`}
          value={current?.escala_lograda === "SIN_ESCALA" ? "Sin escala" : current?.escala_lograda.replace("ESCALA_", "") + "%"}
          tone={current?.escala_lograda === "SIN_ESCALA" ? "orange" : "success"}
          trend={{ direction: "up", label: `Siguiente meta: ${current?.siguiente_meta ?? "—"}` }}
        />
        <KPICard
          label="Rebate ganado"
          value={formatCompact(rebateTotal)}
          tone="success"
          trend={{ direction: "up", label: "Pagadero en producto según acuerdo" }}
        />
        <KPICard
          label="Bloqueado cartera vencida"
          value={formatCompact(rebateBloqueadoCartera)}
          tone="yellow"
          trend={{ direction: rebateBloqueadoCartera > 0 ? "down" : "up", label: rebateBloqueadoCartera > 0 ? "Gate contractual activo" : "Sin bloqueo" }}
        />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
          <h2 className="text-graphite" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Seguimiento semestral
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 11 }}>
            <thead>
              <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th className="px-3 py-2 text-left">Semestre</th>
                <th className="px-3 py-2 text-left">Vigencia</th>
                <th className="px-3 py-2 text-right">Base 2025</th>
                <th className="px-3 py-2 text-right">Ventas 2026</th>
                <th className="px-3 py-2 text-right">Crecimiento</th>
                <th className="px-3 py-2 text-left">Escala</th>
                <th className="px-3 py-2 text-right">Rebate ganado</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {semestres.map((s) => (
                <tr key={s.periodo} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink">{s.periodo.replace("SEMESTRE", "Semestre")}</td>
                  <td className="px-3 py-2 text-stone">
                    {formatDateEs(s.inicio)} – {formatDateEs(s.fin)}
                  </td>
                  <td className="num px-3 py-2 text-right text-stone">{formatCompact(s.base_2025)}</td>
                  <td className="num px-3 py-2 text-right text-ink">{formatCompact(s.venta_lograda)}</td>
                  <td className="num px-3 py-2 text-right text-stone">{s.pct_crecimiento ?? 0}%</td>
                  <td className="px-3 py-2">
                    <ScalePill value={s.escala_lograda} />
                  </td>
                  <td className="num px-3 py-2 text-right text-ink">
                    {formatCompact(s.rebate_ganado)}
                    {s.cartera_vencida && <span className="ml-1 text-red-deep">•</span>}
                  </td>
                  <td className="px-3 py-2">
                    <ScalePill value={s.cartera_vencida ? "NO_CUMPLIDO" : s.estado_periodo} />
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
          Cada semestre 2026 se compara contra su propia base 2025, determinando la escala de crecimiento lograda y
          el rebate correspondiente sobre la venta facturada. A diferencia del tablero anterior, aquí sí se aplica el
          gate contractual real: si Ferreinox tiene cartera vencida con Goya al momento de liquidar, el rebate del
          periodo queda en $0 aunque la escala se haya alcanzado — la cifra que se habría ganado sin esa condición
          queda visible como referencia.
        </p>
      </Card>

      {current && <GoyaSimulator base2025={current.base_2025} />}
    </div>
  );
}
