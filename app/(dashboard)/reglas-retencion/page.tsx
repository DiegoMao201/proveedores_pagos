import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { getRetentionRulesSummary } from "@/lib/retention-rules-summary-data";
import { formatCompact, humanizeProviderName } from "@/lib/format";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const revalidate = 300;

function TasaBadge({ tasa }: { tasa: number | null }) {
  if (tasa == null) return <span className="text-stone">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-cream-soft px-2 py-0.5 font-semibold text-red-deep" style={{ fontSize: 10 }}>
      {(tasa * 100).toFixed(2)}%
    </span>
  );
}

export default async function ReglasRetencionPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  let dataError: string | null = null;
  let summary: Awaited<ReturnType<typeof getRetentionRulesSummary>> = [];

  try {
    summary = await getRetentionRulesSummary();
  } catch (e) {
    dataError = e instanceof Error ? e.message : "Error desconocido";
  }

  if (dataError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-ink" style={{ fontWeight: 800, fontSize: 19 }}>
          Reglas de retención del sistema
        </h1>
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar las reglas de retención. {dataError}
          </p>
        </Card>
      </div>
    );
  }

  const q = sp.q?.toUpperCase() ?? "";
  const tipoFilter = sp.tipo;
  const autoretenedorFilter = sp.autoretenedor;

  const filtered = summary.filter((row) => {
    if (q && !row.nombre.toUpperCase().includes(q)) return false;
    if (autoretenedorFilter === "si" && !row.es_autoretenedor) return false;
    if (autoretenedorFilter === "no" && row.es_autoretenedor) return false;
    if (tipoFilter === "fuente" && row.tasa_fuente == null) return false;
    if (tipoFilter === "ica" && row.tasa_ica == null) return false;
    if (tipoFilter === "iva" && row.tasa_iva == null) return false;
    if (tipoFilter === "otros" && row.tasa_otros == null) return false;
    return true;
  });

  const proveedoresConRetencion = summary.length;
  const reglasActivas = summary.reduce(
    (sum, r) => sum + [r.tasa_fuente, r.tasa_ica, r.tasa_iva, r.tasa_otros].filter((t) => t != null).length,
    0
  );
  const autoretenedores = summary.filter((r) => r.es_autoretenedor).length;
  const retenidoTotal = summary.reduce((sum, r) => sum + r.retenido_hoy, 0);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontWeight: 800, fontSize: 19 }}>
          Reglas de retención del sistema
        </h1>
        <p className="text-stone" style={{ fontSize: 11 }}>
          Todas las reglas activas por proveedor y tipo. Vista informativa — la edición se hace desde el perfil de cada proveedor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KPICard label="Proveedores con retención" value={String(proveedoresConRetencion)} tone="info" />
        <KPICard label="Reglas activas" value={String(reglasActivas)} tone="success" />
        <KPICard label="Autoretenedores" value={String(autoretenedores)} tone="yellow" />
        <KPICard
          label="Retenido hoy"
          value={formatCompact(retenidoTotal)}
          tone="success"
          trend={{ direction: "up", label: "Sobre facturas pendientes" }}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
        <TableToolbar
          searchPlaceholder="Buscar proveedor..."
          filterFields={[
            {
              name: "tipo",
              label: "Tipo",
              type: "select",
              options: [
                { value: "fuente", label: "Fuente" },
                { value: "ica", label: "ICA" },
                { value: "iva", label: "IVA" },
                { value: "otros", label: "Otros" },
              ],
            },
            {
              name: "autoretenedor",
              label: "Autoretenedor",
              type: "select",
              options: [
                { value: "si", label: "Sí" },
                { value: "no", label: "No" },
              ],
            },
          ]}
        />

        {filtered.length === 0 ? (
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
                  <th className="px-4 py-3">Autoretenedor</th>
                  <th className="px-4 py-3">Fuente</th>
                  <th className="px-4 py-3">ICA</th>
                  <th className="px-4 py-3">IVA</th>
                  <th className="px-4 py-3">Otros</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.provider_id} className="border-b border-line last:border-0 hover:bg-cream/30">
                    <td className="px-4 py-2.5 font-semibold text-ink">{humanizeProviderName(row.nombre)}</td>
                    <td className="px-4 py-2.5">
                      {row.es_autoretenedor ? (
                        <span className="inline-flex items-center rounded-full bg-yellow/20 px-2 py-0.5 font-semibold text-graphite" style={{ fontSize: 10 }}>
                          Sí
                        </span>
                      ) : (
                        <span className="text-stone">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.es_autoretenedor && row.tasa_fuente != null ? (
                        <span
                          className="inline-flex items-center rounded-full bg-line px-2 py-0.5 font-semibold text-stone line-through"
                          style={{ fontSize: 10 }}
                          title="Exento por autoretención"
                        >
                          {(row.tasa_fuente * 100).toFixed(2)}%
                        </span>
                      ) : (
                        <TasaBadge tasa={row.tasa_fuente} />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <TasaBadge tasa={row.tasa_ica} />
                    </td>
                    <td className="px-4 py-2.5">
                      <TasaBadge tasa={row.tasa_iva} />
                    </td>
                    <td className="px-4 py-2.5">
                      <TasaBadge tasa={row.tasa_otros} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/proveedores/${row.provider_id}`} className="flex items-center gap-1 text-red-deep" style={{ fontSize: 11, fontWeight: 700 }}>
                        Ver perfil <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
