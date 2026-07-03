"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { formatCompact, formatFull } from "@/lib/format";
import { createBatch } from "@/lib/batch-actions";
import type { ProviderInvoiceCalc, OwnBankAccountRow, DataFreshness } from "@/lib/batch-data";
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
    fresh: {
      bg: "var(--color-line-soft)",
      icon: <CheckCircle2 size={12} className="text-success" />,
      text: `Datos sincronizados con el ERP hace ${Math.round(minutes)} min`,
    },
    stale: {
      bg: "var(--color-cream-soft)",
      icon: <Clock size={12} className="text-orange" />,
      text: `⚠ Datos posiblemente desactualizados — última sync hace ${hours}h`,
    },
    very_stale: {
      bg: "#FCEBEB",
      icon: <AlertTriangle size={12} className="text-red-deep" />,
      text: `⚠ Datos muy desactualizados — última sync hace ${days}d. Verificar antes de armar lote.`,
    },
  }[level];

  return (
    <div
      className="mt-1.5 flex items-center gap-1.5 rounded-md px-2.5 py-1.5"
      style={{ background: config.bg, borderLeft: level === "fresh" ? undefined : `3px solid ${level === "stale" ? "var(--color-orange)" : "var(--color-red-deep)"}` }}
    >
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

export function CreateBatchModal({
  open,
  onClose,
  providerId,
  providerNombre,
  nifDefault,
  selectedInvoices,
  ownAccounts,
  destAccounts,
  fechaPago,
  totals,
  freshness,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  providerId: number;
  providerNombre: string;
  nifDefault: string | null;
  selectedInvoices: ProviderInvoiceCalc[];
  ownAccounts: OwnBankAccountRow[];
  destAccounts: BankAccountRow[];
  fechaPago: string;
  totals: Totals;
  freshness: DataFreshness | null;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  const defaultOwn = ownAccounts.find((a) => a.es_default) ?? ownAccounts[0];
  const defaultDest = destAccounts.find((a) => a.es_principal) ?? destAccounts[0];

  const [ownAccountId, setOwnAccountId] = useState(defaultOwn?.id ?? 0);
  const [destAccountId, setDestAccountId] = useState(defaultDest?.id ?? 0);
  const [descripcion, setDescripcion] = useState("PROVEEDOR");

  const categoria = totals.descuento > 0 ? "CON_DESCUENTO" : "SIN_DESCUENTO";
  const destAccount = destAccounts.find((a) => a.id === destAccountId);
  const canSubmit = ownAccountId > 0 && destAccountId > 0 && destAccount?.inscrita_bancolombia;

  function handleSubmit() {
    startTransition(async () => {
      const result = await createBatch({
        providerId,
        invoiceKeys: selectedInvoices.map((i) => i.invoice_key),
        ownAccountId,
        destAccountId,
        fechaPago,
        descripcion,
      });
      if (result.ok && result.codigoLote) {
        showToast({ kind: "success", message: `Lote ${result.codigoLote} creado.` });
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
      <Modal open={open} onClose={onClose} title="Armar lote de pago" width={560}>
        <div className="flex flex-col gap-3">
          <p className="text-stone" style={{ fontSize: 11 }}>
            Para: <strong className="text-ink">{providerNombre}</strong> · {selectedInvoices.length} facturas
          </p>

          <Card3Col bruto={totals.bruto} neto={totals.neto} count={selectedInvoices.length} />

          <p className="text-stone" style={{ fontSize: 11 }}>
            Descuento capturado: <span className="text-success font-semibold">{formatCompact(totals.descuento)}</span> · Retenciones:{" "}
            <span className="text-orange font-semibold">{formatCompact(totals.retencion)}</span>
          </p>

          <FreshnessIndicator freshness={freshness} />

          <FormField label="Cuenta a debitar">
            <select className={inputClassName(false)} value={ownAccountId} onChange={(e) => setOwnAccountId(Number(e.target.value))}>
              {ownAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alias} — {a.numero_cuenta}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Cuenta destino del proveedor">
            {destAccounts.length > 1 ? (
              <select className={inputClassName(false)} value={destAccountId} onChange={(e) => setDestAccountId(Number(e.target.value))}>
                {destAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.numero_cuenta} {a.es_principal ? "(principal)" : ""}
                  </option>
                ))}
              </select>
            ) : destAccount ? (
              <div className="rounded-md border border-line bg-parchment px-3 py-2" style={{ fontSize: 11 }}>
                <div>Cuenta: {destAccount.numero_cuenta} ({destAccount.tipo_cuenta === "S" ? "Ahorros" : "Corriente"})</div>
                <div>Beneficiario: {destAccount.nombre_beneficiario}</div>
                {destAccount.email_pago && <div>Email: {destAccount.email_pago}</div>}
                <div className={destAccount.inscrita_bancolombia ? "text-success" : "text-orange"}>
                  {destAccount.inscrita_bancolombia ? "✓ Inscrita en Bancolombia" : "⚠ No inscrita en Bancolombia"}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-red bg-cream px-3 py-2 text-red-deep" style={{ fontSize: 11 }}>
                Este proveedor no tiene cuenta bancaria activa. Agrégala desde la pestaña &quot;Cuentas bancarias&quot;.
              </div>
            )}
          </FormField>

          <FormField label="Descripción del pago">
            <input maxLength={30} className={inputClassName(false)} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            <span className="text-stone" style={{ fontSize: 9.5 }}>
              Máx. 30 caracteres — va en la cabecera del archivo PAB.
            </span>
          </FormField>

          <div>
            {categoria === "CON_DESCUENTO" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 font-semibold text-success" style={{ fontSize: 11 }}>
                <CheckCircle2 size={12} /> CON DESCUENTO — Ahorro capturado: {formatCompact(totals.descuento)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange/15 px-3 py-1 font-semibold text-orange" style={{ fontSize: 11 }}>
                SIN DESCUENTO
              </span>
            )}
          </div>

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
              {pending ? "Creando…" : "Confirmar y crear lote"} <ArrowRight size={13} />
            </button>
          </div>
          {!canSubmit && destAccount && !destAccount.inscrita_bancolombia && (
            <p className="text-orange" style={{ fontSize: 10 }}>
              La cuenta destino no está inscrita en Bancolombia — no podrás exportar el PAB hasta inscribirla, pero el
              lote puede crearse en estado borrador.
            </p>
          )}
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}

function Card3Col({ bruto, neto, count }: { bruto: number; neto: number; count: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-md bg-cream-soft p-3">
      <div className="flex items-center gap-1.5">
        <FileText size={14} className="text-red-deep" />
        <span className="text-ink" style={{ fontSize: 11, fontWeight: 700 }}>
          {count} documentos
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Wallet size={14} className="text-graphite" />
        <span className="text-ink" style={{ fontSize: 11 }}>
          Bruto: {formatFull(bruto)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <ArrowRight size={14} className="text-success" />
        <span className="text-success" style={{ fontSize: 11, fontWeight: 700 }}>
          Neto: {formatFull(neto)}
        </span>
      </div>
    </div>
  );
}
