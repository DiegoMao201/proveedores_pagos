"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { formatFull, humanizeProviderName } from "@/lib/format";
import { createBatch } from "@/lib/batch-actions";
import type { MesaInvoiceRow } from "@/lib/mesa-data";
import type { OwnBankAccountRow, DataFreshness } from "@/lib/batch-data";
import type { BankAccountRow } from "@/lib/bank-account-data";

function FreshnessIndicator({ freshness }: { freshness: DataFreshness | null }) {
  if (!freshness || freshness.minutes_since_sync == null) return null;
  const minutes = freshness.minutes_since_sync;
  let level: "fresh" | "stale" | "very_stale";
  if (minutes < 360) level = "fresh";
  else if (minutes < 1440) level = "stale";
  else level = "very_stale";
  const hours = Math.round(minutes / 60);
  const days = Math.round(minutes / 1440);
  const config = {
    fresh: { bg: "var(--color-line-soft)", icon: <CheckCircle2 size={12} className="text-success" />, text: `Datos sincronizados con el ERP hace ${Math.round(minutes)} min` },
    stale: { bg: "var(--color-cream-soft)", icon: <Clock size={12} className="text-orange" />, text: `⚠ Datos posiblemente desactualizados — última sync hace ${hours}h` },
    very_stale: { bg: "#FCEBEB", icon: <AlertTriangle size={12} className="text-red-deep" />, text: `⚠ Última sync hace ${days}d. Verificar antes de armar.` },
  }[level];
  return (
    <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5" style={{ background: config.bg, borderLeft: level === "fresh" ? undefined : `3px solid ${level === "stale" ? "var(--color-orange)" : "var(--color-red-deep)"}` }}>
      {config.icon}
      <span style={{ fontSize: 10 }}>{config.text}</span>
    </div>
  );
}

interface Totals {
  bruto: number;
  descuento: number;
  retencion: number;
  neto: number;
}

interface ProviderChip {
  proveedorId: number;
  nombre: string;
  count: number;
  neto: number;
}

export function ConsolidarLoteModal({
  open,
  onClose,
  selectedInvoices,
  providerChips,
  ownAccounts,
  fechaPago,
  totals,
  freshness,
  totalFacturas,
  totalNCs,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  selectedInvoices: MesaInvoiceRow[];
  providerChips: ProviderChip[];
  ownAccounts: OwnBankAccountRow[];
  fechaPago: string;
  totals: Totals;
  freshness: DataFreshness | null;
  totalFacturas: number;
  totalNCs: number;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  const defaultOwn = ownAccounts.find((a) => a.es_default) ?? ownAccounts[0];
  const [ownAccountId, setOwnAccountId] = useState(defaultOwn?.id ?? 0);
  const esMultiproveedor = providerChips.length > 1;
  const [descripcion, setDescripcion] = useState(esMultiproveedor ? "PROVEEDORES" : "PROVEEDOR");

  const categoriasDistintas = new Set(selectedInvoices.map((i) => i.categoria_proveedor));
  const categoriaLote = categoriasDistintas.size > 1 ? "mixto" : categoriasDistintas.values().next().value ?? "estrategico";
  const categoriaDescuento = totals.descuento > 0 ? "CON_DESCUENTO" : "SIN_DESCUENTO";

  const canSubmit = ownAccountId > 0 && totals.neto > 0;

  function handleSubmit() {
    startTransition(async () => {
      const result = await createBatch({
        providerId: esMultiproveedor ? null : providerChips[0]?.proveedorId ?? null,
        invoiceKeys: selectedInvoices.map((i) => i.invoice_key),
        ownAccountId,
        destAccountId: null,
        fechaPago,
        descripcion,
        esMultiproveedor,
      });
      if (result.ok && result.codigoLote) {
        showToast({ kind: "success", message: `Lote ${result.codigoLote} creado en borrador.` });
        onCreated();
        onClose();
        router.push(`/lotes/${result.codigoLote}`);
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudo crear el lote." });
      }
    });
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Armar lote consolidado" width={720}>
        <div className="flex flex-col gap-3">
          <p className="text-stone" style={{ fontSize: 11 }}>
            {selectedInvoices.length} documentos · {providerChips.length} proveedores · Neto {formatFull(totals.neto)}
          </p>

          <div>
            <p className="text-ink" style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
              Proveedores incluidos ({providerChips.length})
            </p>
            <div className="mt-1.5 flex flex-col gap-2">
              {providerChips.map((c) => {
                const rows = selectedInvoices.filter((i) => i.proveedor_id === c.proveedorId);
                const facturas = rows.filter((r) => r.tipo_documento === "factura").length;
                const ncs = rows.filter((r) => r.tipo_documento === "nota_credito").length;
                const bruto = rows.reduce((s, r) => s + r.valor_bruto, 0);
                const descuento = rows.reduce((s, r) => s + r.valor_descuento, 0);
                const retencion = rows.reduce((s, r) => s + r.valor_retencion_fuente + r.valor_retencion_ica + r.valor_retencion_iva + r.valor_retencion_otros, 0);
                return (
                  <div key={c.proveedorId} className="rounded-md border border-line bg-parchment px-3 py-2.5" style={{ fontSize: 11 }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink" style={{ fontSize: 12 }}>{humanizeProviderName(c.nombre)}</span>
                    </div>
                    <p className="text-stone" style={{ fontSize: 10 }}>Facturas: {facturas} · NCs: {ncs}</p>
                    <p className="num text-ink" style={{ fontSize: 10.5 }}>
                      Bruto: {formatFull(bruto)} · Descuento: −{formatFull(descuento)} · Retenciones: −{formatFull(retencion)} · Neto: {formatFull(c.neto)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <FreshnessIndicator freshness={freshness} />

          <FormField label="Cuenta a debitar">
            <select className={inputClassName(false)} value={ownAccountId} onChange={(e) => setOwnAccountId(Number(e.target.value))}>
              {ownAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.alias} — {a.numero_cuenta}</option>
              ))}
            </select>
            <span className="text-stone" style={{ fontSize: 9.5 }}>Todos los proveedores del lote se debitan de esta cuenta Ferreinox.</span>
          </FormField>

          <FormField label="Descripción del pago">
            <input maxLength={30} className={inputClassName(false)} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            <span className="text-stone" style={{ fontSize: 9.5 }}>{descripcion.length}/30 — va en la cabecera del archivo PAB.</span>
          </FormField>

          <div className="rounded-md p-3" style={{ background: "var(--color-cream-soft)", border: "1px solid var(--color-yellow)" }}>
            <p className="text-stone" style={{ fontSize: 9 }}>BRUTO CONSOLIDADO</p>
            <p className="num text-ink" style={{ fontSize: 13, fontWeight: 700 }}>{formatFull(totals.bruto)}</p>
            <p className="text-success" style={{ fontSize: 10.5 }}>Descuento capturado: −{formatFull(totals.descuento)}</p>
            <p className="text-orange" style={{ fontSize: 10.5 }}>Retenciones: −{formatFull(totals.retencion)}</p>
            <p className="num text-red-deep" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>NETO A PAGAR: {formatFull(totals.neto)}</p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 font-semibold"
              style={{
                fontSize: 10,
                background: categoriaLote === "estrategico" ? "var(--color-success-soft)" : categoriaLote === "locativo" ? "var(--color-cream)" : "var(--color-cream-soft)",
                color: categoriaLote === "estrategico" ? "var(--color-success)" : categoriaLote === "locativo" ? "var(--color-orange)" : "var(--color-yellow)",
              }}
            >
              {categoriaLote === "estrategico" ? "ESTRATÉGICO" : categoriaLote === "locativo" ? "LOCATIVO" : "MIXTO — Estratégicos + Locativos"}
            </span>
            {categoriaDescuento === "CON_DESCUENTO" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 font-semibold text-success" style={{ fontSize: 10.5 }}>
                <CheckCircle2 size={11} /> CON DESCUENTO
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-orange/15 px-3 py-1 font-semibold text-orange" style={{ fontSize: 10.5 }}>
                SIN DESCUENTO
              </span>
            )}
          </div>

          {totalNCs > 0 && (
            <p className="text-stone" style={{ fontSize: 10 }}>
              Incluye {totalFacturas} facturas y {totalNCs} NCs aplicadas como compensación.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending || !canSubmit}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
              style={{ fontSize: 11, fontWeight: 800 }}
            >
              {pending ? "Creando…" : "Confirmar y crear lote consolidado"} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
