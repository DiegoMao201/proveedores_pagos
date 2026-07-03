import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { DiscountRulesSummaryRowItem } from "@/components/providers/discount-rules-summary-row";
import { getDiscountRulesSummary } from "@/lib/discount-rules-summary-data";
import { getAllActiveDiscountRules } from "@/lib/discount-rule-data";
import { formatCompact } from "@/lib/format";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const revalidate = 300;

export default async function ReglasDescuentoPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  let dataError: string | null = null;
  let summary: Awaited<ReturnType<typeof getDiscountRulesSummary>> = [];
  let allRules: Awaited<ReturnType<typeof getAllActiveDiscountRules>> = [];

  try {
    [summary, allRules] = await Promise.all([getDiscountRulesSummary(), getAllActiveDiscountRules()]);
  } catch (e) {
    dataError = e instanceof Error ? e.message : "Error desconocido";
  }

  if (dataError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-ink" style={{ fontWeight: 800, fontSize: 19 }}>
          Reglas de descuento del sistema
        </h1>
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar las reglas de descuento. {dataError}
          </p>
        </Card>
      </div>
    );
  }

  const q = sp.q?.toUpperCase() ?? "";
  const tasaFilter = sp.tasa;
  const diasFilter = sp.dias;

  const rulesByProvider = new Map<number, typeof allRules>();
  for (const r of allRules) {
    const list = rulesByProvider.get(r.provider_id) ?? [];
    list.push(r);
    rulesByProvider.set(r.provider_id, list);
  }

  function passesTasaFilter(rules: typeof allRules): boolean {
    if (!tasaFilter) return true;
    const maxTasa = Math.max(...rules.map((r) => r.tasa_descuento));
    if (tasaFilter === "1-2") return maxTasa >= 0.01 && maxTasa < 0.02;
    if (tasaFilter === "2-5") return maxTasa >= 0.02 && maxTasa < 0.05;
    if (tasaFilter === "5+") return maxTasa >= 0.05;
    return true;
  }

  function passesDiasFilter(rules: typeof allRules): boolean {
    if (!diasFilter) return true;
    const minDias = Math.min(...rules.map((r) => r.dias_max));
    if (diasFilter === "10") return minDias <= 10;
    if (diasFilter === "11-20") return minDias > 10 && minDias <= 20;
    if (diasFilter === "21-30") return minDias > 20 && minDias <= 30;
    if (diasFilter === "30+") return minDias > 30;
    return true;
  }

  const filteredSummary = summary.filter((row) => {
    if (q && !row.nombre.toUpperCase().includes(q)) return false;
    const rules = rulesByProvider.get(row.provider_id) ?? [];
    return passesTasaFilter(rules) && passesDiasFilter(rules);
  });

  const proveedoresConDescuento = summary.length;
  const reglasActivas = allRules.length;
  const ahorroPotencialTotal = summary.reduce((sum, r) => sum + r.ahorro_capturable_actual, 0);
  const ahorroPerdidoTotal = summary.reduce((sum, r) => sum + r.ahorro_perdido_hoy, 0);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontWeight: 800, fontSize: 19 }}>
          Reglas de descuento del sistema
        </h1>
        <p className="text-stone" style={{ fontSize: 11 }}>
          Todas las reglas activas por proveedor. Vista informativa — la edición se hace desde el perfil de cada proveedor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KPICard label="Proveedores con descuento" value={String(proveedoresConDescuento)} tone="info" />
        <KPICard label="Reglas activas" value={String(reglasActivas)} tone="success" />
        <KPICard label="Ahorro capturable actual" value={formatCompact(ahorroPotencialTotal)} tone="success" />
        <KPICard
          label="Ahorro perdido hoy"
          value={formatCompact(ahorroPerdidoTotal)}
          tone="yellow"
          trend={{ direction: "down", label: "Facturas ya fuera de ventana" }}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
        <TableToolbar
          searchPlaceholder="Buscar proveedor..."
          filterFields={[
            {
              name: "tasa",
              label: "Tasa (mejor peldaño)",
              type: "select",
              options: [
                { value: "1-2", label: "1% - 2%" },
                { value: "2-5", label: "2% - 5%" },
                { value: "5+", label: "> 5%" },
              ],
            },
            {
              name: "dias",
              label: "Días (peldaño más rápido)",
              type: "select",
              options: [
                { value: "10", label: "≤ 10 días" },
                { value: "11-20", label: "11 - 20 días" },
                { value: "21-30", label: "21 - 30 días" },
                { value: "30+", label: "> 30 días" },
              ],
            },
          ]}
        />

        {filteredSummary.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-stone" style={{ fontSize: 12 }}>
              Ningún proveedor coincide con este filtro.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 12 }}>
              <thead className="bg-parchment text-left text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <tr>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Peldaños activos</th>
                  <th className="px-4 py-3 text-right">Ahorro capturable</th>
                  <th className="px-4 py-3 text-right">Ahorro perdido hoy</th>
                  <th className="px-4 py-3">Última modificación</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSummary.map((row) => (
                  <DiscountRulesSummaryRowItem key={row.provider_id} row={row} rules={rulesByProvider.get(row.provider_id) ?? []} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
