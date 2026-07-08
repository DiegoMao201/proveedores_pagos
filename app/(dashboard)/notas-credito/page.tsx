import { AlertCircle, FileMinus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getNotasCredito } from "@/lib/notas-credito-data";
import { formatFull } from "@/lib/format";
import { NotasCreditoExportButton } from "@/components/notas-credito/export-button";
import { NotasCreditoTable } from "@/components/notas-credito/notas-credito-table";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

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
            <NotasCreditoTable rows={filtered} />
          </Card>
        </>
      )}
    </div>
  );
}
