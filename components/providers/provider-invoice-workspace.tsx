"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Wallet, Inbox, CheckCircle2, X, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatFull, formatDateEs } from "@/lib/format";
import { recalculateInvoices } from "@/lib/batch-actions";
import { CreateBatchModal } from "@/components/providers/create-batch-modal";
import { ExclusionModal, type ExclusionCandidate } from "@/components/shared/exclusion-modal";
import type {
  ProviderInvoiceCalc,
  OwnBankAccountRow,
  ProviderReconcilingRow,
  ProviderPaidRow,
  DataFreshness,
} from "@/lib/batch-data";
import type { BankAccountRow } from "@/lib/bank-account-data";

type SortKey = "descuento" | "valor" | "vencimiento" | "emision" | "emision_asc" | "numero" | "nc_primero";

function origenBadge(row: ProviderPaidRow) {
  if (row.origen_saldado === "app_batch_confirmado_erp") {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold"
        style={{ fontSize: 9, background: "var(--color-success-soft)", color: "var(--color-success)" }}
        title="Pagado desde la app y confirmado por el ERP"
      >
        APP ✓ ERP{row.payment_batch ? ` · ${row.payment_batch.codigo_lote}` : ""}
      </span>
    );
  }
  if (row.origen_saldado === "app_batch") {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold"
        style={{ fontSize: 9, background: "var(--color-cream-soft)", color: "var(--color-red-deep)" }}
        title="Pagado desde la app, esperando confirmación del ERP"
      >
        APP → {row.payment_batch?.codigo_lote ?? "?"}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold"
      style={{ fontSize: 9, background: "var(--color-line-soft)", color: "var(--color-graphite)" }}
      title="Pago detectado desde el archivo del ERP"
    >
      ERP
    </span>
  );
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function urgencyBadge(fechaVencimiento: string | null, esNotaCredito: boolean) {
  if (esNotaCredito) {
    return (
      <span className="inline-flex items-center rounded-full bg-line px-2 py-0.5 font-semibold text-graphite" style={{ fontSize: 9 }}>
        NC
      </span>
    );
  }
  if (!fechaVencimiento) return <span className="text-stone">—</span>;
  const dias = Math.round((new Date(fechaVencimiento).getTime() - Date.now()) / 86400000);
  if (dias <= 0)
    return (
      <span className="inline-flex items-center rounded-full bg-red-deep px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>
        Hoy vence
      </span>
    );
  if (dias <= 3)
    return (
      <span className="inline-flex items-center rounded-full bg-red px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>
        Vence {dias}d
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-cream px-2 py-0.5 font-semibold text-graphite" style={{ fontSize: 9 }}>
      {dias}d
    </span>
  );
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "descuento", label: "Descuento por perder" },
  { key: "valor", label: "Valor descendente" },
  { key: "vencimiento", label: "Vencimiento próximo" },
  { key: "emision", label: "Emisión (más reciente)" },
  { key: "emision_asc", label: "Emisión (más antigua)" },
  { key: "numero", label: "Número de factura" },
  { key: "nc_primero", label: "NCs primero" },
];

function sortInvoices(list: ProviderInvoiceCalc[], sortKey: SortKey): ProviderInvoiceCalc[] {
  const copy = [...list];
  switch (sortKey) {
    case "valor":
      return copy.sort((a, b) => Math.abs(b.valor_bruto) - Math.abs(a.valor_bruto));
    case "vencimiento":
      return copy.sort((a, b) => {
        if (!a.fecha_vencimiento) return 1;
        if (!b.fecha_vencimiento) return -1;
        return new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime();
      });
    case "emision":
      return copy.sort((a, b) => new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime());
    case "emision_asc":
      return copy.sort((a, b) => new Date(a.fecha_emision).getTime() - new Date(b.fecha_emision).getTime());
    case "numero":
      return copy.sort((a, b) => a.num_factura.localeCompare(b.num_factura, "es", { numeric: true, sensitivity: "base" }));
    case "nc_primero":
      return copy.sort((a, b) => {
        if (a.tipo_documento === b.tipo_documento) return 0;
        return a.tipo_documento === "nota_credito" ? -1 : 1;
      });
    case "descuento":
    default:
      return copy.sort((a, b) => b.valor_descuento - a.valor_descuento);
  }
}

export function ProviderInvoiceWorkspace({
  providerId,
  providerNombre,
  nifDefault,
  initialInvoices,
  ownAccounts,
  destAccounts,
  reconciling,
  paid,
  freshness,
  canEdit,
}: {
  providerId: number;
  providerNombre: string;
  nombreNormalizado: string;
  nifDefault: string | null;
  initialInvoices: ProviderInvoiceCalc[];
  ownAccounts: OwnBankAccountRow[];
  destAccounts: BankAccountRow[];
  reconciling: ProviderReconcilingRow[];
  paid: ProviderPaidRow[];
  freshness: DataFreshness | null;
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<"pagar" | "conciliar" | "pagadas">("pagar");
  const [invoices, setInvoices] = useState(initialInvoices);
  const [fechaPago, setFechaPago] = useState(tomorrowIso());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("descuento");
  const [exclusionCandidates, setExclusionCandidates] = useState<ExclusionCandidate[] | null>(null);
  const [facturaFiltro, setFacturaFiltro] = useState("");

  useEffect(() => {
    startTransition(async () => {
      const fresh = await recalculateInvoices(providerId, fechaPago);
      setInvoices(fresh);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaPago]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllWithDiscount() {
    setSelected((prev) => {
      const next = new Set(prev);
      invoicesFiltradas.filter((i) => i.valor_descuento > 0).forEach((i) => next.add(i.invoice_key));
      return next;
    });
  }

  const facturaQuery = facturaFiltro.trim().toLowerCase();
  const matchesFactura = (numFactura: string | null | undefined, numInterno?: string | null) =>
    !facturaQuery ||
    (numFactura?.toLowerCase().includes(facturaQuery) ?? false) ||
    (numInterno?.toLowerCase().includes(facturaQuery) ?? false);

  const invoicesFiltradas = useMemo(
    () => invoices.filter((i) => matchesFactura(i.num_factura, i.num_factura_erp_interno)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, facturaQuery]
  );
  const reconcilingFiltrado = useMemo(
    () => reconciling.filter((r) => matchesFactura(r.num_factura)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reconciling, facturaQuery]
  );
  const paidFiltrado = useMemo(
    () => paid.filter((p) => matchesFactura(p.num_factura)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paid, facturaQuery]
  );

  const sortedInvoices = useMemo(() => sortInvoices(invoicesFiltradas, sortKey), [invoicesFiltradas, sortKey]);
  const selectedInvoices = useMemo(() => invoices.filter((i) => selected.has(i.invoice_key)), [invoices, selected]);
  const totals = useMemo(() => {
    const bruto = selectedInvoices.reduce((s, i) => s + i.valor_bruto, 0);
    const descuento = selectedInvoices.reduce((s, i) => s + i.valor_descuento, 0);
    const retencion = selectedInvoices.reduce(
      (s, i) => s + i.valor_retencion_fuente + i.valor_retencion_ica + i.valor_retencion_iva + i.valor_retencion_otros,
      0
    );
    const neto = selectedInvoices.reduce((s, i) => s + i.valor_neto, 0);
    return { bruto, descuento, retencion, neto };
  }, [selectedInvoices]);

  const facturas = invoicesFiltradas.filter((i) => i.tipo_documento === "factura");
  const notasCredito = invoicesFiltradas.filter((i) => i.tipo_documento === "nota_credito");
  const totalPendiente = invoicesFiltradas.reduce((s, i) => s + i.valor_bruto, 0);
  const totalNC = notasCredito.reduce((s, i) => s + i.valor_bruto, 0);

  const soloNCSeleccionadas = selectedInvoices.length > 0 && selectedInvoices.every((i) => i.tipo_documento === "nota_credito");
  const netoNegativo = totals.neto < 0;
  const netoCero = selectedInvoices.length > 0 && totals.neto === 0;
  const puedeArmar = canEdit && selectedInvoices.length > 0 && !soloNCSeleccionadas && !netoNegativo;

  return (
    <div className="flex flex-col gap-3" style={{ paddingBottom: selected.size > 0 ? 72 : 0 }}>
      <div className="flex gap-1 border-b border-line">
        {[
          { key: "pagar" as const, label: `Por pagar (${invoices.length})` },
          { key: "conciliar" as const, label: `Por conciliar (${reconciling.length})` },
          { key: "pagadas" as const, label: `Ya pagadas (${paid.length})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="border-b-2 px-3 py-2 font-semibold transition-colors"
            style={{
              fontSize: 11.5,
              borderColor: tab === t.key ? "var(--color-red)" : "transparent",
              color: tab === t.key ? "var(--color-red-deep)" : "var(--color-stone)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1.5" style={{ maxWidth: 280 }}>
        <Search size={13} className="text-stone" />
        <input
          type="text"
          value={facturaFiltro}
          onChange={(e) => setFacturaFiltro(e.target.value)}
          placeholder="Buscar por N° factura o N° interno ERP…"
          className="w-full bg-transparent outline-none"
          style={{ fontSize: 11.5 }}
        />
      </div>

      {tab === "pagar" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-stone" style={{ fontSize: 11 }}>
                {facturas.length} facturas{notasCredito.length > 0 ? ` + ${notasCredito.length} NCs pendientes` : ""} ·{" "}
                {formatCompact(totalPendiente)} bruto neto
              </p>
              {notasCredito.length > 0 && (
                <p className="text-stone" style={{ fontSize: 10 }}>
                  Total NCs disponibles: {formatCompact(totalNC)} en {notasCredito.length} documentos
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && invoices.some((i) => i.valor_descuento > 0) && (
                <button
                  type="button"
                  onClick={selectAllWithDiscount}
                  className="rounded-md bg-cream-soft px-2.5 py-1 font-semibold text-red-deep"
                  style={{ fontSize: 10 }}
                >
                  Seleccionar con descuento vigente ⚡
                </button>
              )}
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-md border border-line bg-paper px-2 py-1 text-stone"
                style={{ fontSize: 10 }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {invoices.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 py-10 text-center">
              <Wallet size={32} className="text-stone" />
              <p className="text-stone" style={{ fontSize: 11 }}>
                Este proveedor no tiene facturas pendientes en el ERP.
              </p>
            </Card>
          ) : (
            <Card className="!p-0 overflow-hidden" style={{ opacity: pending ? 0.6 : 1, transition: "opacity 150ms" }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontSize: 11 }}>
                  <thead className="sticky top-0 bg-paper">
                    <tr className="border-b border-line text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <th className="px-3 py-2 text-left" style={{ width: 24 }}></th>
                      <th className="px-3 py-2 text-left">Factura</th>
                      <th className="px-3 py-2 text-right">Bruto</th>
                      <th className="px-3 py-2 text-right">Descuento</th>
                      <th className="px-3 py-2 text-right">Retenciones</th>
                      <th className="px-3 py-2 text-right">Neto</th>
                      <th className="px-3 py-2 text-left">Urgencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInvoices.map((inv) => {
                      const isSelected = selected.has(inv.invoice_key);
                      const esNC = inv.tipo_documento === "nota_credito";
                      const retTotal = inv.valor_retencion_fuente + inv.valor_retencion_ica + inv.valor_retencion_iva + inv.valor_retencion_otros;
                      const retDetalle = [
                        inv.valor_retencion_fuente > 0 ? `Fuente: −${formatFull(inv.valor_retencion_fuente)}` : null,
                        inv.valor_retencion_ica > 0 ? `ICA: −${formatFull(inv.valor_retencion_ica)}` : null,
                        inv.valor_retencion_iva > 0 ? `IVA: −${formatFull(inv.valor_retencion_iva)}` : null,
                        inv.valor_retencion_otros > 0 ? `Otros: −${formatFull(inv.valor_retencion_otros)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      const ncSubtitle = inv.num_factura_matched
                        ? `Match ✓ con interno ${inv.num_factura_erp_interno} · Emitida ${formatDateEs(inv.fecha_emision)}`
                        : inv.motivo_no_seleccionable
                        ? `Interno del ERP · ${inv.motivo_no_seleccionable}`
                        : `XML del proveedor · Sin registro en ERP`;
                      const puedeSeleccionar = canEdit && inv.es_seleccionable;
                      return (
                        <tr
                          key={inv.invoice_key}
                          className={puedeSeleccionar ? "cursor-pointer border-b border-line last:border-0" : "border-b border-line last:border-0"}
                          style={{ background: isSelected ? "var(--color-cream-soft)" : !inv.es_seleccionable ? "var(--color-line-soft)" : "transparent" }}
                          onClick={() => puedeSeleccionar && toggle(inv.invoice_key)}
                          title={!inv.es_seleccionable ? inv.motivo_no_seleccionable ?? undefined : undefined}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!puedeSeleccionar}
                              readOnly
                              style={{ width: 14, height: 14, accentColor: "var(--color-red-deep)" }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <p
                              className="font-semibold"
                              style={{ fontSize: 12, color: !inv.es_seleccionable ? "var(--color-graphite)" : esNC ? "var(--color-red-deep)" : "var(--color-ink)" }}
                            >
                              {esNC ? "NC " : ""}
                              {inv.num_factura}
                              {esNC && !inv.es_seleccionable && (
                                <span
                                  className="ml-1.5 inline-flex items-center rounded"
                                  style={{ fontSize: 9, fontWeight: 700, background: "var(--color-cream)", color: "var(--color-orange)", padding: "1px 5px" }}
                                >
                                  Interna sin XML
                                </span>
                              )}
                              {!esNC && !inv.tiene_correo_asociado && (
                                <span
                                  className="ml-1.5 inline-flex items-center rounded"
                                  style={{ fontSize: 9, fontWeight: 700, background: "var(--color-cream)", color: "var(--color-graphite)", padding: "1px 5px" }}
                                >
                                  Sin XML
                                </span>
                              )}
                            </p>
                            {esNC ? (
                              <p className="text-stone" style={{ fontSize: 9.5 }}>
                                {ncSubtitle}
                              </p>
                            ) : inv.num_factura_erp_interno && inv.num_factura_erp_interno !== inv.num_factura ? (
                              <p className="text-stone" style={{ fontSize: 9.5 }}>
                                Interno: {inv.num_factura_erp_interno} · Emitida {formatDateEs(inv.fecha_emision)}
                              </p>
                            ) : (
                              <p className="text-stone" style={{ fontSize: 9.5 }}>
                                Emitida {formatDateEs(inv.fecha_emision)}
                              </p>
                            )}
                          </td>
                          <td className="num px-3 py-2 text-right" style={{ fontWeight: 700, color: esNC ? "var(--color-red-deep)" : "var(--color-ink)" }}>
                            {esNC ? `−${formatFull(Math.abs(inv.valor_bruto))}` : formatFull(inv.valor_bruto)}
                          </td>
                          {esNC ? (
                            <>
                              <td className="num px-3 py-2 text-right text-stone">—</td>
                              <td className="num px-3 py-2 text-right text-stone">—</td>
                              <td className="num px-3 py-2 text-right text-stone">—</td>
                            </>
                          ) : (
                            <>
                              <td className="num px-3 py-2 text-right">
                                {inv.valor_descuento > 0 ? (
                                  <span className="text-success">−{formatFull(inv.valor_descuento)}</span>
                                ) : (
                                  <span className="text-stone">Sin dcto</span>
                                )}
                              </td>
                              <td className="num px-3 py-2 text-right" title={retDetalle || undefined}>
                                {retTotal > 0 ? <span className="text-orange">−{formatFull(retTotal)}</span> : <span className="text-stone">—</span>}
                              </td>
                              <td className="num px-3 py-2 text-right font-semibold text-ink">{formatFull(inv.valor_neto)}</td>
                            </>
                          )}
                          <td className="px-3 py-2">
                            {esNC ? (
                              <span className="inline-flex items-center rounded-full bg-red-deep px-2 py-0.5 font-semibold text-white" style={{ fontSize: 9 }}>
                                NC
                              </span>
                            ) : (
                              urgencyBadge(inv.fecha_vencimiento, inv.es_nota_credito)
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "conciliar" && (
        <Card className="!p-0 overflow-hidden">
          {reconcilingFiltrado.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox size={32} className="text-stone" />
              <p className="text-stone" style={{ fontSize: 11 }}>
                No hay facturas de correo sin match en el ERP para este proveedor.
              </p>
            </div>
          ) : (
            <table className="w-full" style={{ fontSize: 11 }}>
              <thead>
                <tr className="border-b border-line bg-parchment text-stone" style={{ fontSize: 9, textTransform: "uppercase" }}>
                  <th className="px-3 py-2 text-left">Factura</th>
                  <th className="px-3 py-2 text-left">Emisión</th>
                  <th className="px-3 py-2 text-right">Valor correo</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {reconcilingFiltrado.map((r) => {
                  const esNC = r.tipo_documento_correo === "NOTA_CREDITO";
                  return (
                    <tr key={r.invoice_key} className="border-b border-line last:border-0">
                      <td className="px-3 py-2" style={{ color: esNC ? "var(--color-red-deep)" : "var(--color-ink)", fontWeight: esNC ? 700 : 400 }}>
                        {esNC && (
                          <span
                            className="mr-1.5 inline-flex items-center rounded-full bg-red-deep px-1.5 py-0.5 font-semibold text-white"
                            style={{ fontSize: 8.5 }}
                          >
                            NC
                          </span>
                        )}
                        {r.num_factura}
                      </td>
                      <td className="px-3 py-2 text-stone">{r.fecha_emision_correo ? formatDateEs(r.fecha_emision_correo) : "—"}</td>
                      <td
                        className="num px-3 py-2 text-right"
                        style={{ color: esNC ? "var(--color-red-deep)" : "var(--color-ink)", fontWeight: esNC ? 700 : 400 }}
                      >
                        {esNC ? `−${formatFull(Math.abs(r.valor_total_correo))}` : formatFull(r.valor_total_correo)}
                      </td>
                      <td className="px-3 py-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              setExclusionCandidates([
                                {
                                  invoiceKey: r.invoice_key,
                                  numFactura: r.num_factura,
                                  proveedor: providerNombre,
                                  valor: r.valor_total_correo,
                                  esNotaCredito: esNC,
                                },
                              ])
                            }
                            className="flex items-center gap-1 text-stone hover:text-red-deep"
                            style={{ fontSize: 10, fontWeight: 700 }}
                          >
                            <X size={10} /> Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === "pagadas" && (
        <Card className="!p-0 overflow-hidden">
          {paidFiltrado.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckCircle2 size={32} className="text-stone" />
              <p className="text-stone" style={{ fontSize: 11 }}>
                No hay facturas saldadas registradas para este proveedor.
              </p>
            </div>
          ) : (
            <table className="w-full" style={{ fontSize: 11 }}>
              <thead>
                <tr className="border-b border-line bg-parchment text-stone" style={{ fontSize: 9, textTransform: "uppercase" }}>
                  <th className="px-3 py-2 text-left">Factura</th>
                  <th className="px-3 py-2 text-left">Emisión</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-left">Origen</th>
                  <th className="px-3 py-2 text-left">Fecha pago</th>
                </tr>
              </thead>
              <tbody>
                {paidFiltrado.map((r) => (
                  <tr key={r.invoice_key} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-ink">{r.num_factura}</td>
                    <td className="px-3 py-2 text-stone">{r.fecha_emision_erp ? formatDateEs(r.fecha_emision_erp) : "—"}</td>
                    <td className="num px-3 py-2 text-right text-ink">{formatFull(r.valor_pagado ?? r.valor_total_erp)}</td>
                    <td className="px-3 py-2">{origenBadge(r)}</td>
                    <td className="px-3 py-2 text-stone">{r.fecha_pago ? formatDateEs(r.fecha_pago) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {selected.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t-2 bg-paper shadow-lg"
          style={{ borderColor: "var(--color-red-deep)", padding: "10px 20px" }}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
            <div>
              <p className="text-stone" style={{ fontSize: 9, fontWeight: 700 }}>
                LOTE EN CONSTRUCCIÓN
              </p>
              <p className="text-ink" style={{ fontSize: 12, fontWeight: 700 }}>
                {selected.size} documentos seleccionados
                {selectedInvoices.some((i) => i.tipo_documento === "nota_credito") && (
                  <span className="text-stone" style={{ fontWeight: 400 }}>
                    {" "}
                    ({selectedInvoices.filter((i) => i.tipo_documento === "factura").length} facturas +{" "}
                    {selectedInvoices.filter((i) => i.tipo_documento === "nota_credito").length} NCs)
                  </span>
                )}
              </p>
              {soloNCSeleccionadas && (
                <p className="text-red-deep" style={{ fontSize: 9.5 }}>
                  Un lote debe incluir al menos una factura positiva.
                </p>
              )}
              {netoNegativo && (
                <p className="text-red-deep" style={{ fontSize: 9.5 }}>
                  El lote resulta en pago negativo. Quitá NCs o agregá facturas.
                </p>
              )}
              {netoCero && (
                <p className="text-orange" style={{ fontSize: 9.5 }}>
                  El lote no genera pago (facturas y NCs se compensan).
                </p>
              )}
            </div>
            <label className="flex flex-col gap-0.5">
              <span className="text-stone" style={{ fontSize: 9, fontWeight: 700 }}>
                FECHA PAGO
              </span>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="rounded-md border border-line bg-paper px-2 py-1"
                style={{ fontSize: 11 }}
              />
            </label>
            <div>
              <p className="text-stone" style={{ fontSize: 9, fontWeight: 700 }}>
                BRUTO
              </p>
              <p className="num text-ink" style={{ fontSize: 12 }}>
                {formatFull(totals.bruto)}
              </p>
            </div>
            <div>
              <p className="text-success" style={{ fontSize: 9, fontWeight: 700 }}>
                DESCUENTO
              </p>
              <p className="num text-success" style={{ fontSize: 12 }}>
                −{formatFull(totals.descuento)}
              </p>
            </div>
            <div>
              <p className="text-orange" style={{ fontSize: 9, fontWeight: 700 }}>
                RETENCIONES
              </p>
              <p className="num text-orange" style={{ fontSize: 12 }}>
                −{formatFull(totals.retencion)}
              </p>
            </div>
            <div>
              <p className="text-red-deep" style={{ fontSize: 9, fontWeight: 800 }}>
                NETO
              </p>
              <p className="num text-red-deep" style={{ fontSize: 14, fontWeight: 800 }}>
                {formatFull(totals.neto)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={!puedeArmar}
              title={
                soloNCSeleccionadas
                  ? "Un lote debe incluir al menos una factura positiva. Las NCs se aplican como compensación."
                  : netoNegativo
                  ? "El lote resulta en pago negativo. Quitá NCs o agregá facturas."
                  : undefined
              }
              className="ml-auto rounded-md bg-red-deep px-5 py-2 text-white disabled:opacity-40"
              style={{ fontSize: 12, fontWeight: 800 }}
            >
              Armar lote →
            </button>
          </div>
        </div>
      )}

      <CreateBatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        providerId={providerId}
        providerNombre={providerNombre}
        nifDefault={nifDefault}
        selectedInvoices={selectedInvoices}
        ownAccounts={ownAccounts}
        destAccounts={destAccounts}
        fechaPago={fechaPago}
        freshness={freshness}
        totals={totals}
        onCreated={() => setSelected(new Set())}
      />

      {exclusionCandidates && (
        <ExclusionModal
          open={true}
          onClose={() => setExclusionCandidates(null)}
          candidates={exclusionCandidates}
          source="manual_ui_proveedor"
          onExcluded={() => setExclusionCandidates(null)}
        />
      )}
    </div>
  );
}
