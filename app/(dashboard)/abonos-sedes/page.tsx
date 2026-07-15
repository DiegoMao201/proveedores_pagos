import { redirect } from "next/navigation";
import { Eye, FileSpreadsheet } from "lucide-react";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { AnularAbonoButton } from "@/components/abonos-sedes/anular-abono-button";
import { getAllSedeAbonos, TIPO_ORIGEN_LABELS, type Sede, type SedeAbonoEstado, type SedeAbonoTipoOrigen } from "@/lib/sede-abono-data";
import { formatFull, formatDateEs, humanizeProviderName } from "@/lib/format";

const SEDES: Sede[] = ["Manizales", "Armenia", "Pereira"];
const ESTADOS: SedeAbonoEstado[] = ["disponible", "aplicado", "anulado"];
const TIPOS: SedeAbonoTipoOrigen[] = ["planilla", "recibo_caja"];

const ESTADO_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  disponible: { label: "Disponible", bg: "var(--color-cream-soft)", color: "var(--color-orange)" },
  aplicado: { label: "Aplicado", bg: "var(--color-success-soft)", color: "var(--color-success)" },
  anulado: { label: "Anulado", bg: "var(--color-line-soft)", color: "var(--color-graphite)" },
};

interface PageProps {
  searchParams: Promise<{ sede?: string; estado?: string; tipo?: string; desde?: string; hasta?: string }>;
}

export default async function AbonosSedesPage({ searchParams }: PageProps) {
  const session = await auth();
  const canManage = session?.user.role ? ["admin", "tesoreria", "contabilidad"].includes(session.user.role) : false;
  if (!canManage) redirect("/");

  const sp = await searchParams;
  const filters = {
    sede: SEDES.includes(sp.sede as Sede) ? (sp.sede as Sede) : undefined,
    estado: ESTADOS.includes(sp.estado as SedeAbonoEstado) ? (sp.estado as SedeAbonoEstado) : undefined,
    tipoOrigen: TIPOS.includes(sp.tipo as SedeAbonoTipoOrigen) ? (sp.tipo as SedeAbonoTipoOrigen) : undefined,
    desde: sp.desde,
    hasta: sp.hasta,
  };

  let abonos: Awaited<ReturnType<typeof getAllSedeAbonos>> = [];
  let dataError: string | null = null;
  try {
    abonos = await getAllSedeAbonos(filters);
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  const totalDisponible = abonos.filter((a) => a.estado === "disponible").reduce((s, a) => s + a.valor, 0);
  const totalAplicado = abonos.filter((a) => a.estado === "aplicado").reduce((s, a) => s + a.valor, 0);
  const totalGeneral = abonos.filter((a) => a.estado !== "anulado").reduce((s, a) => s + a.valor, 0);

  const exportParams = new URLSearchParams();
  if (sp.sede) exportParams.set("sede", sp.sede);
  if (sp.estado) exportParams.set("estado", sp.estado);
  if (sp.tipo) exportParams.set("tipo", sp.tipo);
  if (sp.desde) exportParams.set("desde", sp.desde);
  if (sp.hasta) exportParams.set("hasta", sp.hasta);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
            Abonos de sedes
          </h1>
          <p className="text-stone" style={{ fontSize: 12 }}>
            Consignaciones directas de Manizales, Armenia y Pereira a proveedores — hoy solo Pintuco.
          </p>
        </div>
        <a
          href={`/api/abonos-sedes/export?${exportParams.toString()}`}
          className="flex items-center gap-1.5 rounded-md bg-red-deep px-3.5 py-2 text-white"
          style={{ fontSize: 12, fontWeight: 800 }}
        >
          <FileSpreadsheet size={14} /> Descargar Excel
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Card style={{ borderColor: "var(--color-orange)" }}>
          <p className="text-orange" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Disponible</p>
          <p className="num text-ink" style={{ fontWeight: 800, fontSize: 18, marginTop: 4 }}>{formatFull(totalDisponible)}</p>
        </Card>
        <Card style={{ borderColor: "var(--color-success)" }}>
          <p className="text-success" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Aplicado a lotes</p>
          <p className="num text-ink" style={{ fontWeight: 800, fontSize: 18, marginTop: 4 }}>{formatFull(totalAplicado)}</p>
        </Card>
        <Card>
          <p className="text-stone" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Total del rango</p>
          <p className="num text-ink" style={{ fontWeight: 800, fontSize: 18, marginTop: 4 }}>{formatFull(totalGeneral)}</p>
        </Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <form method="get" className="flex flex-wrap items-end gap-3 border-b border-line bg-parchment px-4 py-3">
          <div>
            <label className="mb-1 block text-graphite" style={{ fontSize: 10.5, fontWeight: 700 }}>Sede</label>
            <select name="sede" defaultValue={sp.sede ?? ""} className="rounded-md border border-line bg-paper px-2.5 py-1.5" style={{ fontSize: 12 }}>
              <option value="">Todas</option>
              {SEDES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-graphite" style={{ fontSize: 10.5, fontWeight: 700 }}>Motivo</label>
            <select name="tipo" defaultValue={sp.tipo ?? ""} className="rounded-md border border-line bg-paper px-2.5 py-1.5" style={{ fontSize: 12 }}>
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{TIPO_ORIGEN_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-graphite" style={{ fontSize: 10.5, fontWeight: 700 }}>Estado</label>
            <select name="estado" defaultValue={sp.estado ?? ""} className="rounded-md border border-line bg-paper px-2.5 py-1.5" style={{ fontSize: 12 }}>
              <option value="">Todos</option>
              <option value="disponible">Disponible</option>
              <option value="aplicado">Aplicado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-graphite" style={{ fontSize: 10.5, fontWeight: 700 }}>Período desde</label>
            <input type="date" name="desde" defaultValue={sp.desde ?? ""} className="rounded-md border border-line bg-paper px-2.5 py-1.5" style={{ fontSize: 12 }} />
          </div>
          <div>
            <label className="mb-1 block text-graphite" style={{ fontSize: 10.5, fontWeight: 700 }}>Período hasta</label>
            <input type="date" name="hasta" defaultValue={sp.hasta ?? ""} className="rounded-md border border-line bg-paper px-2.5 py-1.5" style={{ fontSize: 12 }} />
          </div>
          <button type="submit" className="rounded-md bg-red-deep px-4 py-1.5 text-white" style={{ fontSize: 12, fontWeight: 800 }}>
            Filtrar
          </button>
          {(sp.sede || sp.estado || sp.tipo || sp.desde || sp.hasta) && (
            <a href="/abonos-sedes" className="text-stone" style={{ fontSize: 11, fontWeight: 700 }}>
              Limpiar
            </a>
          )}
        </form>

        {dataError ? (
          <p className="p-4 text-sm font-semibold text-red-deep">No pudimos cargar los abonos. Verifica tu conexión y reintenta.</p>
        ) : abonos.length === 0 ? (
          <p className="p-6 text-center text-stone" style={{ fontSize: 12 }}>Ningún abono coincide con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 11.5 }}>
              <thead>
                <tr className="border-b border-line bg-parchment text-stone" style={{ fontSize: 9, textTransform: "uppercase" }}>
                  <th className="px-3 py-2 text-left">Motivo</th>
                  <th className="px-3 py-2 text-left">Período</th>
                  <th className="px-3 py-2 text-left">Sede</th>
                  <th className="px-3 py-2 text-left">Proveedor</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-left">Referencia</th>
                  <th className="px-3 py-2 text-left">Reportó</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2" style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {abonos.map((a) => {
                  const estado = ESTADO_LABELS[a.estado];
                  return (
                    <tr key={a.id} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 font-semibold text-ink">{TIPO_ORIGEN_LABELS[a.tipo_origen]}</td>
                      <td className="date px-3 py-2 text-stone">
                        {formatDateEs(a.periodo_desde)}{a.periodo_desde !== a.periodo_hasta ? ` — ${formatDateEs(a.periodo_hasta)}` : ""}
                      </td>
                      <td className="px-3 py-2 font-semibold text-ink">{a.sede}</td>
                      <td className="px-3 py-2 text-stone">{a.proveedor_nombre ? humanizeProviderName(a.proveedor_nombre) : "—"}</td>
                      <td className="num px-3 py-2 text-right font-semibold">{formatFull(a.valor)}</td>
                      <td className="px-3 py-2 text-stone">{a.numero_referencia ?? "—"}</td>
                      <td className="px-3 py-2 text-stone">{a.created_by_nombre ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 9.5, background: estado.bg, color: estado.color }}>
                          {estado.label}
                        </span>
                        {a.estado === "aplicado" && a.codigo_lote && (
                          <a href={`/lotes/${a.codigo_lote}`} className="ml-1 text-stone hover:text-red-deep" style={{ fontSize: 9.5 }}>
                            · {a.codigo_lote}
                          </a>
                        )}
                        {a.estado === "anulado" && a.anulado_motivo && (
                          <p className="text-stone" style={{ fontSize: 9.5, marginTop: 1 }}>{a.anulado_motivo}</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <a href={`/api/abonos/${a.id}/comprobante`} target="_blank" rel="noreferrer" className="text-stone hover:text-red-deep" title="Ver comprobante">
                            <Eye size={14} />
                          </a>
                          {a.estado === "disponible" && <AnularAbonoButton abonoId={a.id} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
