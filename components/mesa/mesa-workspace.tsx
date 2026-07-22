"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatFull, formatDateEs, humanizeProviderName } from "@/lib/format";
import { recalculateMesaInvoices } from "@/lib/batch-actions";
import { ConsolidarLoteModal } from "@/components/mesa/consolidar-lote-modal";
import type { MesaInvoiceRow } from "@/lib/mesa-data";
import type { OwnBankAccountRow, DataFreshness } from "@/lib/batch-data";

type CategoriaFiltro = "estrategico" | "locativo" | "todos";
type UrgenciaFiltro = "descuento" | "semana" | "mes" | "todas";
type OrdenFiltro = "descuento" | "valor" | "vencimiento" | "proveedor" | "emision" | "numero";

const CATEGORIA_OPTIONS: { key: CategoriaFiltro; label: string }[] = [
  { key: "estrategico", label: "Estratégicos (mercancía)" },
  { key: "locativo", label: "Locativos (servicios, arriendos)" },
  { key: "todos", label: "Todos pagables" },
];

const URGENCIA_OPTIONS: { key: UrgenciaFiltro; label: string }[] = [
  { key: "descuento", label: "Con descuento vigente" },
  { key: "semana", label: "Vencen esta semana" },
  { key: "mes", label: "Vencen este mes" },
  { key: "todas", label: "Todas activas" },
];

const ORDEN_OPTIONS: { key: OrdenFiltro; label: string }[] = [
  { key: "descuento", label: "Descuento por perder ⚡" },
  { key: "valor", label: "Valor descendente" },
  { key: "vencimiento", label: "Vencimiento próximo" },
  { key: "emision", label: "Fecha de emisión" },
  { key: "numero", label: "Número de factura" },
  { key: "proveedor", label: "Proveedor A-Z" },
];

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.round((new Date(fecha).getTime() - Date.now()) / 86400000);
}

const SELECTED_STORAGE_KEY = "mesa_pagos_lote_seleccionado";

interface Totals {
  bruto: number;
  descuento: number;
  retencion: number;
  neto: number;
}

function sumTotals(rows: MesaInvoiceRow[]): Totals {
  return {
    bruto: rows.reduce((s, i) => s + i.valor_bruto, 0),
    descuento: rows.reduce((s, i) => s + i.valor_descuento, 0),
    retencion: rows.reduce((s, i) => s + i.valor_retencion_fuente + i.valor_retencion_ica + i.valor_retencion_iva + i.valor_retencion_otros, 0),
    neto: rows.reduce((s, i) => s + i.valor_neto, 0),
  };
}

export function MesaDePagosWorkspace({
  initialInvoices,
  ownAccounts,
  freshness,
  canEdit,
}: {
  initialInvoices: MesaInvoiceRow[];
  ownAccounts: OwnBankAccountRow[];
  freshness: DataFreshness | null;
  canEdit: boolean;
}) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [fechaPago, setFechaPago] = useState(tomorrowIso());
  const [categoria, setCategoria] = useState<CategoriaFiltro>("todos");
  const [proveedorFiltro, setProveedorFiltro] = useState("");
  const [urgencia, setUrgencia] = useState<UrgenciaFiltro>("todas");
  const [orden, setOrden] = useState<OrdenFiltro>("descuento");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set(initialInvoices.map((i) => i.proveedor_id)));
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const skipNextCategoriaClear = useRef(true);

  useEffect(() => {
    startTransition(async () => {
      const fresh = await recalculateMesaInvoices(fechaPago);
      setInvoices(fresh);
      setCollapsed(new Set(fresh.map((i) => i.proveedor_id)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaPago]);

  // Restaura la selección al volver a Mesa de pagos (ej. si el usuario se
  // fue a revisar un proveedor mientras armaba un lote) para que la barra
  // flotante no se borre por navegar fuera de esta página.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(SELECTED_STORAGE_KEY);
      if (raw) setSelected(new Set(JSON.parse(raw) as string[]));
    } catch {
      // sessionStorage no disponible o valor corrupto: seguimos sin selección restaurada
    }
  }, []);

  useEffect(() => {
    try {
      if (selected.size > 0) {
        window.sessionStorage.setItem(SELECTED_STORAGE_KEY, JSON.stringify(Array.from(selected)));
      } else {
        window.sessionStorage.removeItem(SELECTED_STORAGE_KEY);
      }
    } catch {
      // sessionStorage no disponible: la selección solo vive en memoria
    }
  }, [selected]);

  useEffect(() => {
    if (skipNextCategoriaClear.current) {
      skipNextCategoriaClear.current = false;
      return;
    }
    setSelected(new Set());
  }, [categoria]);

  const porCategoria = useMemo(() => {
    if (categoria === "todos") return invoices;
    return invoices.filter((i) => i.categoria_proveedor === categoria);
  }, [invoices, categoria]);

  const porUrgencia = useMemo(() => {
    if (urgencia === "todas") return porCategoria;
    if (urgencia === "descuento") return porCategoria.filter((i) => i.valor_descuento > 0 || i.tipo_documento === "nota_credito");
    const limite = urgencia === "semana" ? 7 : 31;
    return porCategoria.filter((i) => {
      if (i.tipo_documento === "nota_credito") return true;
      const dias = diasHasta(i.fecha_vencimiento);
      return dias != null && dias <= limite;
    });
  }, [porCategoria, urgencia]);

  const visibles = useMemo(() => {
    if (!proveedorFiltro.trim()) return porUrgencia;
    const q = proveedorFiltro.trim().toLowerCase();
    return porUrgencia.filter(
      (i) =>
        humanizeProviderName(i.nombre_proveedor).toLowerCase().includes(q) ||
        i.num_factura?.toLowerCase().includes(q) ||
        i.num_factura_erp_interno?.toLowerCase().includes(q)
    );
  }, [porUrgencia, proveedorFiltro]);

  const groups = useMemo(() => {
    const byProvider = new Map<number, MesaInvoiceRow[]>();
    for (const row of visibles) {
      const list = byProvider.get(row.proveedor_id) ?? [];
      list.push(row);
      byProvider.set(row.proveedor_id, list);
    }
    const sortRows = (rows: MesaInvoiceRow[]) => {
      const copy = [...rows];
      switch (orden) {
        case "valor":
          return copy.sort((a, b) => Math.abs(b.valor_bruto) - Math.abs(a.valor_bruto));
        case "vencimiento":
          return copy.sort((a, b) => {
            if (!a.fecha_vencimiento) return 1;
            if (!b.fecha_vencimiento) return -1;
            return new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime();
          });
        case "proveedor":
          return copy;
        case "emision":
          return copy.sort((a, b) => new Date(a.fecha_emision).getTime() - new Date(b.fecha_emision).getTime());
        case "numero":
          return copy.sort((a, b) => a.num_factura.localeCompare(b.num_factura, "es", { numeric: true, sensitivity: "base" }));
        case "descuento":
        default:
          return copy.sort((a, b) => b.valor_descuento - a.valor_descuento);
      }
    };
    const result = Array.from(byProvider.entries()).map(([proveedorId, rows]) => ({
      proveedorId,
      nombreProveedor: rows[0].nombre_proveedor,
      categoriaProveedor: rows[0].categoria_proveedor,
      rows: sortRows(rows),
      totals: sumTotals(rows),
    }));
    if (orden === "proveedor") {
      result.sort((a, b) => humanizeProviderName(a.nombreProveedor).localeCompare(humanizeProviderName(b.nombreProveedor)));
    } else {
      result.sort((a, b) => b.totals.neto - a.totals.neto);
    }
    return result;
  }, [visibles, orden]);

  const selectedInvoices = useMemo(() => invoices.filter((i) => selected.has(i.invoice_key)), [invoices, selected]);
  const totals = useMemo(() => sumTotals(selectedInvoices), [selectedInvoices]);
  const hasSelection = selectedInvoices.length > 0;

  const providerChips = useMemo(() => {
    const byProvider = new Map<number, { nombre: string; rows: MesaInvoiceRow[] }>();
    for (const row of selectedInvoices) {
      const entry = byProvider.get(row.proveedor_id) ?? { nombre: row.nombre_proveedor, rows: [] };
      entry.rows.push(row);
      byProvider.set(row.proveedor_id, entry);
    }
    return Array.from(byProvider.entries()).map(([proveedorId, entry]) => ({
      proveedorId,
      nombre: humanizeProviderName(entry.nombre),
      count: entry.rows.length,
      neto: entry.rows.reduce((s, r) => s + r.valor_neto, 0),
    }));
  }, [selectedInvoices]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleCollapsed(providerId: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  }

  function selectAllWithDiscount() {
    setSelected((prev) => {
      const next = new Set(prev);
      porCategoria.filter((i) => i.valor_descuento > 0).forEach((i) => next.add(i.invoice_key));
      return next;
    });
  }

  function selectProviderAll(providerId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      visibles.filter((i) => i.proveedor_id === providerId && i.es_seleccionable).forEach((i) => next.add(i.invoice_key));
      return next;
    });
  }

  const soloNCSeleccionadas = selectedInvoices.length > 0 && selectedInvoices.every((i) => i.tipo_documento === "nota_credito");
  const netoNegativo = totals.neto < 0;
  const numProveedores = providerChips.length;
  const totalFacturas = selectedInvoices.filter((i) => i.tipo_documento === "factura").length;
  const totalNCs = selectedInvoices.filter((i) => i.tipo_documento === "nota_credito").length;

  const totalBrutoVisible = visibles.reduce((s, i) => s + i.valor_bruto, 0);
  const totalDescuentoVisible = visibles.reduce((s, i) => s + i.valor_descuento, 0);

  return (
    <div className="flex flex-col gap-3" style={{ paddingBottom: hasSelection ? 96 : 0 }}>
      <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-paper p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div
            className="flex flex-col gap-1 rounded-md p-2"
            style={{ border: "2px solid var(--color-red-deep)", background: "var(--color-cream-soft)" }}
          >
            <span className="text-stone" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em" }}>CATEGORÍA</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaFiltro)}
              className="rounded-md border border-line bg-paper px-2 py-1"
              style={{ fontSize: 11, width: 220 }}
            >
              {CATEGORIA_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-stone" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>PROVEEDOR O FACTURA</span>
            <input
              value={proveedorFiltro}
              onChange={(e) => setProveedorFiltro(e.target.value)}
              placeholder="Nombre, N° factura o N° interno ERP"
              className="rounded-md border border-line bg-paper px-2 py-1"
              style={{ fontSize: 11, width: 180 }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-stone" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>MOSTRAR</span>
            <select
              value={urgencia}
              onChange={(e) => setUrgencia(e.target.value as UrgenciaFiltro)}
              className="rounded-md border border-line bg-paper px-2 py-1"
              style={{ fontSize: 11 }}
            >
              {URGENCIA_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-stone" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>ORDEN</span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenFiltro)}
              className="rounded-md border border-line bg-paper px-2 py-1"
              style={{ fontSize: 11 }}
            >
              {ORDEN_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={selectAllWithDiscount}
                className="rounded-md bg-cream-soft px-2.5 py-1 font-semibold text-red-deep"
                style={{ fontSize: 10 }}
              >
                Seleccionar todas con descuento vigente ⚡
              </button>
            )}
            {hasSelection && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-graphite"
                style={{ fontSize: 10, fontWeight: 700 }}
              >
                Deseleccionar todas
              </button>
            )}
          </div>
        </div>

        <p className="text-stone" style={{ fontSize: 11 }}>
          {visibles.filter((i) => i.tipo_documento === "factura").length} facturas + {visibles.filter((i) => i.tipo_documento === "nota_credito").length} NCs ·{" "}
          {groups.length} proveedores · {formatFull(totalBrutoVisible)} pagable
          {totalDescuentoVisible > 0 && (
            <span className="text-success"> · Descuento capturable si pagas hoy: {formatFull(totalDescuentoVisible)}</span>
          )}
        </p>
      </div>

      {pending && <p className="text-stone" style={{ fontSize: 10 }}>Recalculando…</p>}

      <div className="flex flex-col gap-3">
        {groups.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-14 text-center">
            <Wallet size={32} className="text-stone" />
            <p className="text-stone" style={{ fontSize: 11 }}>No hay facturas que coincidan con estos filtros.</p>
          </Card>
        ) : (
          groups.map((g) => {
            const isCollapsed = collapsed.has(g.proveedorId);
            return (
              <Card key={g.proveedorId} className="!p-0 overflow-hidden">
                <div
                  className="flex cursor-pointer items-center gap-2 px-3.5 py-2.5"
                  style={{ background: "var(--color-cream-soft)" }}
                  onClick={() => toggleCollapsed(g.proveedorId)}
                >
                  {isCollapsed ? <ChevronRight size={14} className="text-stone" /> : <ChevronDown size={14} className="text-stone" />}
                  <span className="text-ink" style={{ fontSize: 13, fontWeight: 800 }}>{humanizeProviderName(g.nombreProveedor)}</span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold"
                    style={{
                      fontSize: 9,
                      background: g.categoriaProveedor === "estrategico" ? "var(--color-success-soft)" : "var(--color-cream)",
                      color: g.categoriaProveedor === "estrategico" ? "var(--color-success)" : "var(--color-orange)",
                    }}
                  >
                    {g.categoriaProveedor === "estrategico" ? "Estratégico" : "Locativo"}
                  </span>
                  <span className="text-stone" style={{ fontSize: 10 }}>
                    {g.rows.filter((r) => r.tipo_documento === "factura").length} facturas
                    {g.rows.some((r) => r.tipo_documento === "nota_credito") ? ` + ${g.rows.filter((r) => r.tipo_documento === "nota_credito").length} NCs` : ""} ·{" "}
                    {formatFull(g.totals.neto)}
                  </span>
                  <div className="flex-1" />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectProviderAll(g.proveedorId);
                      }}
                      className="text-red-deep"
                      style={{ fontSize: 10, fontWeight: 700 }}
                    >
                      Seleccionar todas de este proveedor
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ fontSize: 11 }}>
                      <tbody>
                        {g.rows.map((inv) => {
                          const isSelected = selected.has(inv.invoice_key);
                          const esNC = inv.tipo_documento === "nota_credito";
                          const retTotal = inv.valor_retencion_fuente + inv.valor_retencion_ica + inv.valor_retencion_iva + inv.valor_retencion_otros;
                          const puedeSeleccionar = canEdit && inv.es_seleccionable;
                          return (
                            <tr
                              key={inv.invoice_key}
                              className="border-b border-line last:border-0"
                              style={{ background: isSelected ? "var(--color-cream-soft)" : !inv.es_seleccionable ? "var(--color-line-soft)" : "transparent", cursor: puedeSeleccionar ? "pointer" : "default" }}
                              onClick={() => puedeSeleccionar && toggle(inv.invoice_key)}
                              title={!inv.es_seleccionable ? inv.motivo_no_seleccionable ?? undefined : undefined}
                            >
                              <td className="px-3 py-2" style={{ width: 24 }}>
                                <input type="checkbox" checked={isSelected} disabled={!puedeSeleccionar} readOnly style={{ width: 14, height: 14, accentColor: "var(--color-red-deep)" }} />
                              </td>
                              <td className="px-2 py-2">
                                <p className="font-semibold" style={{ fontSize: 12, color: !inv.es_seleccionable ? "var(--color-graphite)" : esNC ? "var(--color-red-deep)" : "var(--color-ink)" }}>
                                  {esNC ? "NC " : ""}{inv.num_factura}
                                  {inv.match_por_valor && (
                                    <span className="ml-1.5 inline-flex items-center rounded" style={{ fontSize: 9, fontWeight: 700, background: "var(--color-success-soft)", color: "var(--color-success)", padding: "1px 5px" }}>
                                      Match ✓
                                    </span>
                                  )}
                                  {!inv.tiene_correo_asociado && !esNC && (
                                    <span className="ml-1.5 inline-flex items-center rounded" style={{ fontSize: 9, fontWeight: 700, background: "var(--color-cream)", color: "var(--color-graphite)", padding: "1px 5px" }}>
                                      Sin XML
                                    </span>
                                  )}
                                </p>
                                {inv.num_factura_erp_interno && inv.num_factura_erp_interno !== inv.num_factura && (
                                  <p className="text-stone" style={{ fontSize: 9.5 }}>Interno: {inv.num_factura_erp_interno} · Emitida {formatDateEs(inv.fecha_emision)}</p>
                                )}
                              </td>
                              <td className="num px-2 py-2 text-right" style={{ fontWeight: 700, color: esNC ? "var(--color-red-deep)" : "var(--color-ink)" }}>
                                {esNC ? `−${formatFull(Math.abs(inv.valor_bruto))}` : formatFull(inv.valor_bruto)}
                              </td>
                              {esNC ? (
                                <>
                                  <td className="num px-2 py-2 text-right text-stone">—</td>
                                  <td className="num px-2 py-2 text-right text-stone">—</td>
                                  <td className="num px-2 py-2 text-right text-stone">—</td>
                                </>
                              ) : (
                                <>
                                  <td className="num px-2 py-2 text-right">
                                    {inv.valor_descuento > 0 ? <span className="text-success">−{formatFull(inv.valor_descuento)}</span> : <span className="text-stone">Sin dcto</span>}
                                  </td>
                                  <td className="num px-2 py-2 text-right">
                                    {retTotal > 0 ? <span className="text-orange">−{formatFull(retTotal)}</span> : <span className="text-stone">—</span>}
                                  </td>
                                  <td className="num px-2 py-2 text-right font-semibold text-ink">{formatFull(inv.valor_neto)}</td>
                                </>
                              )}
                              <td className="px-2 py-2">
                                {esNC ? (
                                  <span className="inline-flex items-center rounded-full bg-red-deep px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>NC</span>
                                ) : !inv.fecha_vencimiento ? (
                                  <span className="text-stone">—</span>
                                ) : (
                                  (() => {
                                    const dias = diasHasta(inv.fecha_vencimiento) ?? 0;
                                    if (dias <= 0) return <span className="inline-flex items-center rounded-full bg-red-deep px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>Hoy vence</span>;
                                    if (dias <= 3) return <span className="inline-flex items-center rounded-full bg-red px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>Vence {dias}d</span>;
                                    return <span className="inline-flex items-center rounded-full bg-cream px-2 py-0.5 font-semibold text-graphite" style={{ fontSize: 9 }}>{dias}d</span>;
                                  })()
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {hasSelection && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 bg-paper shadow-lg" style={{ borderColor: "var(--color-red-deep)", padding: "10px 20px" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
            <div>
              <p className="text-stone" style={{ fontSize: 9, fontWeight: 700 }}>LOTE CONSOLIDADO</p>
              <p className="text-ink" style={{ fontSize: 12, fontWeight: 700 }}>
                {selectedInvoices.length} documentos de {numProveedores} proveedores seleccionados
              </p>
              {soloNCSeleccionadas && <p className="text-red-deep" style={{ fontSize: 9.5 }}>Un lote debe incluir al menos una factura positiva.</p>}
              {netoNegativo && <p className="text-red-deep" style={{ fontSize: 9.5 }}>El lote resulta en pago negativo. Quitá NCs o agregá facturas.</p>}
            </div>

            <div className="flex flex-wrap gap-1.5 overflow-x-auto" style={{ maxWidth: 320 }}>
              {providerChips.map((c) => (
                <span key={c.proveedorId} className="whitespace-nowrap rounded-full bg-line-soft px-2 py-1" style={{ fontSize: 9.5 }}>
                  {c.nombre} ({c.count}·{formatCompact(c.neto)})
                </span>
              ))}
            </div>

            <label className="flex flex-col gap-0.5">
              <span className="text-stone" style={{ fontSize: 9, fontWeight: 700 }}>FECHA PAGO</span>
              <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="rounded-md border border-line bg-paper px-2 py-1" style={{ fontSize: 11 }} />
            </label>

            <div>
              <p className="text-stone" style={{ fontSize: 9, fontWeight: 700 }}>BRUTO</p>
              <p className="num text-ink" style={{ fontSize: 12 }}>{formatFull(totals.bruto)}</p>
            </div>
            <div>
              <p className="text-success" style={{ fontSize: 9, fontWeight: 700 }}>DESCUENTO</p>
              <p className="num text-success" style={{ fontSize: 12 }}>−{formatFull(totals.descuento)}</p>
            </div>
            <div>
              <p className="text-orange" style={{ fontSize: 9, fontWeight: 700 }}>RETENCIONES</p>
              <p className="num text-orange" style={{ fontSize: 12 }}>−{formatFull(totals.retencion)}</p>
            </div>
            <div>
              <p className="text-red-deep" style={{ fontSize: 9, fontWeight: 800 }}>NETO</p>
              <p className="num text-red-deep" style={{ fontSize: 14, fontWeight: 800 }}>{formatFull(totals.neto)}</p>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={!canEdit || soloNCSeleccionadas || netoNegativo}
              className="ml-auto rounded-md bg-red-deep px-5 py-2 text-white disabled:opacity-40"
              style={{ fontSize: 12, fontWeight: 800 }}
            >
              Armar lote consolidado →
            </button>
          </div>
        </div>
      )}

      <ConsolidarLoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedInvoices={selectedInvoices}
        providerChips={providerChips}
        ownAccounts={ownAccounts}
        fechaPago={fechaPago}
        totals={totals}
        freshness={freshness}
        totalFacturas={totalFacturas}
        totalNCs={totalNCs}
        onCreated={() => setSelected(new Set())}
      />
    </div>
  );
}
