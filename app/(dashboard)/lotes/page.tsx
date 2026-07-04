import Link from "next/link";
import { FilePlus, Layers, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getBatchesSummaryList, type BatchListRow } from "@/lib/lotes-data";
import { formatCompact, formatFull, formatDateEs, humanizeProviderName } from "@/lib/format";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const ESTADO_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: "Borrador", bg: "var(--color-cream-soft)", color: "var(--color-orange)" },
  exported: { label: "Exportado", bg: "var(--color-cream)", color: "var(--color-orange)" },
  paid: { label: "Pagado", bg: "var(--color-success-soft)", color: "var(--color-success)" },
  cancelled: { label: "Cancelado", bg: "var(--color-line-soft)", color: "var(--color-graphite)" },
};

const CATEGORIA_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  estrategico: { label: "Estratégico", bg: "var(--color-success-soft)", color: "var(--color-success)" },
  locativo: { label: "Locativo", bg: "var(--color-cream)", color: "var(--color-orange)" },
  mixto: { label: "Mixto", bg: "var(--color-cream-soft)", color: "var(--color-yellow)" },
};

function isThisMonth(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default async function LotesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const estadoFiltro = sp.estado ?? "activos";
  const tipoFiltro = sp.tipo ?? "todos";
  const categoriaFiltro = sp.categoria ?? "todas";

  let dataError: string | null = null;
  let batches: BatchListRow[] = [];

  try {
    batches = await getBatchesSummaryList();
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  const draftBatches = batches.filter((b) => b.estado === "draft");
  const exportedBatches = batches.filter((b) => b.estado === "exported");
  const paidThisMonth = batches.filter((b) => b.estado === "paid" && isThisMonth(b.paid_at));

  const draftValue = draftBatches.reduce((s, b) => s + b.valor_neto, 0);
  const exportedValue = exportedBatches.reduce((s, b) => s + b.valor_neto, 0);
  const paidThisMonthValue = paidThisMonth.reduce((s, b) => s + b.valor_neto, 0);
  const savingsThisMonth = paidThisMonth.reduce((s, b) => s + b.valor_descuento, 0);

  let filtered = batches;
  if (estadoFiltro === "activos") {
    filtered = filtered.filter((b) => b.estado === "draft" || b.estado === "exported");
  } else if (estadoFiltro !== "todos") {
    filtered = filtered.filter((b) => b.estado === estadoFiltro);
  }
  if (tipoFiltro === "single") filtered = filtered.filter((b) => !b.es_multiproveedor);
  if (tipoFiltro === "multi") filtered = filtered.filter((b) => b.es_multiproveedor);
  if (categoriaFiltro !== "todas") filtered = filtered.filter((b) => b.categoria_lote === categoriaFiltro);

  function filterHref(next: Record<string, string>) {
    const params = new URLSearchParams({ estado: estadoFiltro, tipo: tipoFiltro, categoria: categoriaFiltro, ...next });
    return `/lotes?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
            Lotes de pago
          </h1>
          <p className="text-stone" style={{ fontSize: 12 }}>
            {draftBatches.length + exportedBatches.length} lotes activos · {paidThisMonth.length} pagados este mes
          </p>
        </div>
        <details className="relative">
          <summary
            className="flex cursor-pointer list-none items-center gap-1.5 rounded-md bg-red-deep px-3.5 py-2 text-white"
            style={{ fontSize: 12, fontWeight: 800 }}
          >
            <FilePlus size={14} /> Nuevo lote <ChevronDown size={12} />
          </summary>
          <div
            className="absolute right-0 z-10 mt-1 flex w-64 flex-col overflow-hidden rounded-md border border-line bg-paper shadow-lg"
            style={{ fontSize: 11.5 }}
          >
            <Link href="/mesa-de-pagos" className="px-3.5 py-2.5 text-ink hover:bg-cream-soft">
              Desde Mesa de pagos (multi-proveedor)
            </Link>
            <Link href="/proveedores" className="border-t border-line px-3.5 py-2.5 text-ink hover:bg-cream-soft">
              Desde proveedor específico
            </Link>
          </div>
        </details>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="text-sm font-semibold text-red-deep">No pudimos cargar los lotes. Verifica tu conexión y reintenta.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Card style={{ background: "var(--color-cream-soft)", borderColor: "var(--color-yellow)" }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-graphite)" }}>
                En construcción
              </p>
              <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{draftBatches.length}</p>
              <p className="text-stone" style={{ fontSize: 10 }}>{formatCompact(draftValue)} en borrador</p>
            </Card>
            <Card style={{ background: "var(--color-cream)", borderColor: "var(--color-orange)" }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-orange)" }}>
                Exportados
              </p>
              <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{exportedBatches.length}</p>
              <p className="text-stone" style={{ fontSize: 10 }}>{formatCompact(exportedValue)} esperando pago</p>
            </Card>
            <Card style={{ borderColor: "var(--color-success)" }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-success)" }}>
                Pagados este mes
              </p>
              <p className="num text-ink" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{paidThisMonth.length}</p>
              <p className="text-stone" style={{ fontSize: 10 }}>{formatCompact(paidThisMonthValue)} pagado</p>
            </Card>
            <Card style={{ background: "var(--color-success-soft)", borderColor: "var(--color-success)" }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-success)" }}>
                Ahorro capturado mes
              </p>
              <p className="num text-success" style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{formatCompact(savingsThisMonth)}</p>
              <p className="text-stone" style={{ fontSize: 10 }}>por descuento pronto pago</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-paper p-2.5">
            <FilterGroup label="Estado" active={estadoFiltro} options={[
              { key: "activos", label: "Activos" },
              { key: "draft", label: "Borrador" },
              { key: "exported", label: "Exportado" },
              { key: "paid", label: "Pagado" },
              { key: "cancelled", label: "Cancelado" },
              { key: "todos", label: "Todos" },
            ]} makeHref={(k) => filterHref({ estado: k })} />
            <FilterGroup label="Tipo" active={tipoFiltro} options={[
              { key: "todos", label: "Todos" },
              { key: "single", label: "Single" },
              { key: "multi", label: "Multi" },
            ]} makeHref={(k) => filterHref({ tipo: k })} />
            <FilterGroup label="Categoría" active={categoriaFiltro} options={[
              { key: "todas", label: "Todas" },
              { key: "estrategico", label: "Estratégico" },
              { key: "locativo", label: "Locativo" },
              { key: "mixto", label: "Mixto" },
            ]} makeHref={(k) => filterHref({ categoria: k })} />
          </div>

          {filtered.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
              <Layers size={40} className="text-stone" />
              {batches.length === 0 ? (
                <>
                  <p className="text-ink" style={{ fontSize: 14, fontWeight: 700 }}>Aún no hay lotes de pago</p>
                  <p className="max-w-md text-stone" style={{ fontSize: 11.5 }}>
                    Arma tu primer lote desde la Mesa de pagos.
                  </p>
                  <Link
                    href="/mesa-de-pagos"
                    className="rounded-md bg-red-deep px-4 py-2 text-white"
                    style={{ fontSize: 12, fontWeight: 800 }}
                  >
                    Ir a Mesa de pagos
                  </Link>
                </>
              ) : (
                <p className="text-stone" style={{ fontSize: 12 }}>No hay lotes que coincidan con estos filtros.</p>
              )}
            </Card>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-3 py-3">Tipo</th>
                      <th className="px-4 py-3">Proveedor(es)</th>
                      <th className="px-4 py-3">Fecha pago</th>
                      <th className="px-3 py-3 text-right">Docs</th>
                      <th className="px-4 py-3 text-right">Neto</th>
                      <th className="px-3 py-3">Categoría</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-4 py-3">Creado por</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b) => {
                      const estado = ESTADO_LABELS[b.estado];
                      const cat = b.categoria_lote ? CATEGORIA_LABELS[b.categoria_lote] : null;
                      return (
                        <tr key={b.id} className="border-b border-line last:border-0 hover:bg-cream/30">
                          <td className="px-4 py-3">
                            <Link href={`/lotes/${b.codigo_lote}`} className="font-semibold text-ink hover:text-red-deep">
                              {b.codigo_lote}
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            {b.es_multiproveedor ? (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-white"
                                style={{ fontSize: 9, background: "var(--color-red-deep)" }}
                              >
                                Multi
                              </span>
                            ) : (
                              <span className="text-stone">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-ink" title={b.proveedores_nombres_concat ?? undefined}>
                            {b.es_multiproveedor
                              ? `Multi · ${b.num_proveedores} · ${(b.proveedores_nombres_concat ?? "")
                                  .split(", ")
                                  .slice(0, 2)
                                  .map(humanizeProviderName)
                                  .join(", ")}${b.num_proveedores > 2 ? "…" : ""}`
                              : humanizeProviderName(b.proveedor_nombre_single ?? "")}
                          </td>
                          <td className="date px-4 py-3">{formatDateEs(b.fecha_pago_programada)}</td>
                          <td className="num px-3 py-3 text-right">{b.num_documentos}</td>
                          <td className="num px-4 py-3 text-right" style={{ fontWeight: 700 }}>{formatFull(b.valor_neto)}</td>
                          <td className="px-3 py-3">
                            {cat && (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold"
                                style={{ fontSize: 9, background: cat.bg, color: cat.color }}
                              >
                                {cat.label}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold"
                              style={{ fontSize: 9, background: estado.bg, color: estado.color }}
                            >
                              {estado.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-stone">{b.created_by_nombre ?? "—"}</td>
                          <td className="px-3 py-3">
                            <Link href={`/lotes/${b.codigo_lote}`} className="text-stone hover:text-red-deep" style={{ fontSize: 11, fontWeight: 700 }}>
                              Ver →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  active,
  options,
  makeHref,
}: {
  label: string;
  active: string;
  options: { key: string; label: string }[];
  makeHref: (key: string) => string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-stone" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
      </span>
      <div className="flex gap-1">
        {options.map((o) => (
          <Link
            key={o.key}
            href={makeHref(o.key)}
            prefetch={false}
            className="rounded-full border px-2.5 py-1 font-semibold"
            style={{
              fontSize: 10,
              borderColor: active === o.key ? "var(--color-red)" : "var(--color-line)",
              color: active === o.key ? "var(--color-red-deep)" : "var(--color-graphite)",
              background: active === o.key ? "var(--color-cream-soft)" : "transparent",
            }}
          >
            {o.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
