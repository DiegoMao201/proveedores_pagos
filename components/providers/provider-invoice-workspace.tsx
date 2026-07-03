"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Wallet, Inbox, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatDateEs } from "@/lib/format";
import { recalculateInvoices } from "@/lib/batch-actions";
import { CreateBatchModal } from "@/components/providers/create-batch-modal";
import type {
  ProviderInvoiceCalc,
  OwnBankAccountRow,
  ProviderReconcilingRow,
  ProviderPaidRow,
  DataFreshness,
} from "@/lib/batch-data";
import type { BankAccountRow } from "@/lib/bank-account-data";

type SortKey = "descuento" | "valor" | "vencimiento" | "emision";

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
  { key: "emision", label: "Emisión reciente" },
];

function sortInvoices(list: ProviderInvoiceCalc[], sortKey: SortKey): ProviderInvoiceCalc[] {
  const copy = [...list];
  switch (sortKey) {
    case "valor":
      return copy.sort((a, b) => b.valor_neto - a.valor_neto);
    case "vencimiento":
      return copy.sort((a, b) => {
        if (!a.fecha_vencimiento) return 1;
        if (!b.fecha_vencimiento) return -1;
        return new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime();
      });
    case "emision":
      return copy.sort((a, b) => new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime());
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
      invoices.filter((i) => i.valor_descuento > 0).forEach((i) => next.add(i.invoice_key));
      return next;
    });
  }

  const sortedInvoices = useMemo(() => sortInvoices(invoices, sortKey), [invoices, sortKey]);
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

  const totalPendiente = invoices.reduce((s, i) => s + i.valor_bruto, 0);

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

      {tab === "pagar" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-stone" style={{ fontSize: 11 }}>
              {invoices.length} facturas · {formatCompact(totalPendiente)} total pendiente
            </p>
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
                      const retTotal = inv.valor_retencion_fuente + inv.valor_retencion_ica + inv.valor_retencion_iva + inv.valor_retencion_otros;
                      const retDetalle = [
                        inv.valor_retencion_fuente > 0 ? `Fuente: −${formatCompact(inv.valor_retencion_fuente)}` : null,
                        inv.valor_retencion_ica > 0 ? `ICA: −${formatCompact(inv.valor_retencion_ica)}` : null,
                        inv.valor_retencion_iva > 0 ? `IVA: −${formatCompact(inv.valor_retencion_iva)}` : null,
                        inv.valor_retencion_otros > 0 ? `Otros: −${formatCompact(inv.valor_retencion_otros)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <tr
                          key={inv.invoice_key}
                          className="cursor-pointer border-b border-line last:border-0"
                          style={{ background: isSelected ? "var(--color-cream-soft)" : "transparent" }}
                          onClick={() => canEdit && toggle(inv.invoice_key)}
                        >
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={isSelected} disabled={!canEdit} readOnly style={{ width: 14, height: 14, accentColor: "var(--color-red-deep)" }} />
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-ink">{inv.num_factura}</p>
                            <p className="text-stone" style={{ fontSize: 9.5 }}>
                              Emitida {formatDateEs(inv.fecha_emision)}
                            </p>
                          </td>
                          <td className="num px-3 py-2 text-right text-ink">{formatCompact(inv.valor_bruto)}</td>
                          <td className="num px-3 py-2 text-right">
                            {inv.valor_descuento > 0 ? (
                              <span className="text-success">−{formatCompact(inv.valor_descuento)}</span>
                            ) : (
                              <span className="text-stone">Sin dcto</span>
                            )}
                          </td>
                          <td className="num px-3 py-2 text-right" title={retDetalle || undefined}>
                            {retTotal > 0 ? <span className="text-orange">−{formatCompact(retTotal)}</span> : <span className="text-stone">—</span>}
                          </td>
                          <td className="num px-3 py-2 text-right font-semibold text-ink">{formatCompact(inv.valor_neto)}</td>
                          <td className="px-3 py-2">{urgencyBadge(inv.fecha_vencimiento, inv.es_nota_credito)}</td>
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
          {reconciling.length === 0 ? (
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
                </tr>
              </thead>
              <tbody>
                {reconciling.map((r) => (
                  <tr key={r.invoice_key} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-ink">{r.num_factura}</td>
                    <td className="px-3 py-2 text-stone">{r.fecha_emision_correo ? formatDateEs(r.fecha_emision_correo) : "—"}</td>
                    <td className="num px-3 py-2 text-right text-ink">{formatCompact(r.valor_total_correo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === "pagadas" && (
        <Card className="!p-0 overflow-hidden">
          {paid.length === 0 ? (
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
                {paid.map((r) => (
                  <tr key={r.invoice_key} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-ink">{r.num_factura}</td>
                    <td className="px-3 py-2 text-stone">{r.fecha_emision_erp ? formatDateEs(r.fecha_emision_erp) : "—"}</td>
                    <td className="num px-3 py-2 text-right text-ink">{formatCompact(r.valor_pagado ?? r.valor_total_erp)}</td>
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
              </p>
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
                {formatCompact(totals.bruto)}
              </p>
            </div>
            <div>
              <p className="text-success" style={{ fontSize: 9, fontWeight: 700 }}>
                DESCUENTO
              </p>
              <p className="num text-success" style={{ fontSize: 12 }}>
                −{formatCompact(totals.descuento)}
              </p>
            </div>
            <div>
              <p className="text-orange" style={{ fontSize: 9, fontWeight: 700 }}>
                RETENCIONES
              </p>
              <p className="num text-orange" style={{ fontSize: 12 }}>
                −{formatCompact(totals.retencion)}
              </p>
            </div>
            <div>
              <p className="text-red-deep" style={{ fontSize: 9, fontWeight: 800 }}>
                NETO
              </p>
              <p className="num text-red-deep" style={{ fontSize: 14, fontWeight: 800 }}>
                {formatCompact(totals.neto)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={!canEdit}
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
    </div>
  );
}
