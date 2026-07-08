import { AlertCircle, FileMinus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getNotasCredito } from "@/lib/notas-credito-data";
import { formatFull, formatDateEs } from "@/lib/format";
import { NotasCreditoExportButton } from "@/components/notas-credito/export-button";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const CATEGORIA_LABELS: Record<string, string> = {
  estrategico: "Estratégico",
  locativo: "Locativo",
  institucional: "Institucional",
};

export default async function NotasCreditoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const proveedorFiltro = sp.proveedor?.trim() ?? "";
  const categoriaFiltro = sp.categoria ?? "todas";
  const desdeFiltro = sp.desde ?? "";
  const hastaFiltro = sp.hasta ?? "";

  let dataError: string | null = null;
  let rows: Awaited<ReturnType<typeof getNotasCredito>> = [];

  try {
    rows = await getNotasCredito();
  } catch (e) {
    dataError = e instanceof Error ? e.message : "Error desconocido";
  }

  let filtered = rows;
  if (proveedorFiltro) {
    const needle = proveedorFiltro.toLowerCase();
    filtered = filtered.filter((r) => r.nombre_proveedor.toLowerCase().includes(needle));
  }
  if (categoriaFiltro !== "todas") {
    filtered = filtered.filter((r) => r.categoria_proveedor === categoriaFiltro);
  }
  if (desdeFiltro) {
    filtered = filtered.filter((r) => r.fecha_emision && r.fecha_emision >= desdeFiltro);
  }
  if (hastaFiltro) {
    filtered = filtered.filter((r) => r.fecha_emision && r.fecha_emision <= hastaFiltro);
  }

  const total = filtered.reduce((s, r) => s + r.valor_bruto, 0);
  const disponibles = filtered.filter((r) => r.es_seleccionable);
  const esperando = filtered.filter((r) => !r.es_seleccionable);
  const hayFiltrosActivos = Boolean(proveedorFiltro || categoriaFiltro !== "todas" || desdeFiltro || hastaFiltro);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notas crédito</h1>
          <p className="text-sm text-stone">Todas las notas crédito pendientes de proveedores, en un solo lugar.</p>
        </div>
        <NotasCreditoExportButton disabled={rows.length === 0} />
      </div>

      <Card>
        <form method="GET" className="flex flex-wrap items-end gap-2.5">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
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
              Categoría
            </label>
            <select
              name="categoria"
              defaultValue={categoriaFiltro}
              className="rounded-md border border-line px-2 py-1.5"
              style={{ fontSize: 11.5 }}
            >
              <option value="todas">Todas</option>
              <option value="estrategico">Estratégico</option>
              <option value="locativo">Locativo</option>
              <option value="institucional">Institucional</option>
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
            <a href="/notas-credito" className="rounded-md border border-line px-3 py-2 text-graphite" style={{ fontSize: 11.5, fontWeight: 700 }}>
              Limpiar
            </a>
          )}
        </form>
      </Card>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar las notas crédito. {dataError}
          </p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <FileMinus size={32} className="text-stone" />
          <p className="text-stone" style={{ fontSize: 11 }}>
            No hay notas crédito pendientes.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <FileMinus size={32} className="text-stone" />
          <p className="text-stone" style={{ fontSize: 11 }}>
            No hay notas crédito que coincidan con estos filtros.
          </p>
        </Card>
      ) : (
        <>
          <p className="text-stone" style={{ fontSize: 11 }}>
            {filtered.length} notas crédito · {formatFull(Math.abs(total))} en total ·{" "}
            {disponibles.length} disponibles para aplicar · {esperando.length} esperando nota de proveedor
          </p>

          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 11 }}>
                <thead className="sticky top-0 bg-paper">
                  <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th className="px-3 py-2 text-left" style={{ width: 24 }}></th>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-left">Categoría</th>
                    <th className="px-3 py-2 text-left">Nota crédito</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const subtitle = inv.num_factura_matched
                      ? `Match ✓ con interno ${inv.num_factura_erp_interno} · Emitida ${inv.fecha_emision ? formatDateEs(inv.fecha_emision) : "—"}`
                      : inv.motivo_no_seleccionable
                      ? `Interno del ERP · ${inv.motivo_no_seleccionable}`
                      : `XML del proveedor · Sin registro en ERP`;
                    return (
                      <tr
                        key={inv.invoice_key}
                        className="border-b border-line last:border-0"
                        style={{ background: !inv.es_seleccionable ? "var(--color-line-soft)" : "transparent" }}
                        title={!inv.es_seleccionable ? inv.motivo_no_seleccionable ?? undefined : undefined}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={false}
                            disabled
                            readOnly
                            style={{ width: 14, height: 14, accentColor: "var(--color-red-deep)" }}
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-ink">{inv.nombre_proveedor}</td>
                        <td className="px-3 py-2 text-stone" style={{ fontSize: 10.5 }}>
                          {CATEGORIA_LABELS[inv.categoria_proveedor] ?? inv.categoria_proveedor}
                        </td>
                        <td className="px-3 py-2">
                          <p
                            className="font-semibold"
                            style={{ fontSize: 12, color: !inv.es_seleccionable ? "var(--color-graphite)" : "var(--color-red-deep)" }}
                          >
                            NC {inv.num_factura}
                            {!inv.es_seleccionable && (
                              <span
                                className="ml-1.5 inline-flex items-center rounded"
                                style={{ fontSize: 9, fontWeight: 700, background: "var(--color-cream)", color: "var(--color-orange)", padding: "1px 5px" }}
                              >
                                Interna sin XML
                              </span>
                            )}
                          </p>
                          <p className="text-stone" style={{ fontSize: 9.5 }}>
                            {subtitle}
                          </p>
                        </td>
                        <td className="num px-3 py-2 text-right" style={{ fontWeight: 700, color: "var(--color-red-deep)" }}>
                          −{formatFull(Math.abs(inv.valor_bruto))}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded-full bg-red-deep px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>
                            NC
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
