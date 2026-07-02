"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { Toast, useToast } from "@/components/ui/toast";
import { updateProviderConditions } from "@/lib/provider-actions";
import type { ProviderFull } from "@/lib/provider-detail-data";

const FORMAS_PAGO = [
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "pse", label: "PSE" },
];

export function EditableConditionsForm({ provider, canEdit }: { provider: ProviderFull; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [plazoPago, setPlazoPago] = useState(String(provider.plazo_pago_dias ?? ""));
  const [formaPago, setFormaPago] = useState(provider.forma_pago ?? "transferencia");
  const [limiteCredito, setLimiteCredito] = useState(String(provider.limite_credito ?? ""));
  const [diaCorte, setDiaCorte] = useState(String(provider.dia_corte_pagos ?? ""));
  const [anomalyDetection, setAnomalyDetection] = useState(provider.anomaly_detection);

  function reset() {
    setPlazoPago(String(provider.plazo_pago_dias ?? ""));
    setFormaPago(provider.forma_pago ?? "transferencia");
    setLimiteCredito(String(provider.limite_credito ?? ""));
    setDiaCorte(String(provider.dia_corte_pagos ?? ""));
    setAnomalyDetection(provider.anomaly_detection);
    setEditing(false);
  }

  function save() {
    startTransition(async () => {
      try {
        await updateProviderConditions(provider.id, {
          plazo_pago_dias: plazoPago ? Number(plazoPago) : null,
          forma_pago: formaPago || null,
          limite_credito: limiteCredito ? Number(limiteCredito) : null,
          dia_corte_pagos: diaCorte ? Number(diaCorte) : null,
          anomaly_detection: anomalyDetection,
        });
        showToast({ kind: "success", message: "Condiciones comerciales actualizadas." });
        setEditing(false);
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo guardar." });
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12 }}>
          Condiciones comerciales
        </h2>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 text-red-deep" style={{ fontSize: 11, fontWeight: 700 }}>
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Plazo de pago (días)">
          <input type="number" disabled={!editing} className={inputClassName(!editing)} value={plazoPago} onChange={(e) => setPlazoPago(e.target.value)} />
        </FormField>
        <FormField label="Forma de pago">
          <select disabled={!editing} className={inputClassName(!editing)} value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
            {FORMAS_PAGO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Límite de crédito">
          <input type="number" disabled={!editing} className={inputClassName(!editing)} value={limiteCredito} onChange={(e) => setLimiteCredito(e.target.value)} />
        </FormField>
        <FormField label="Día de corte de pagos (1-31)">
          <input type="number" min={1} max={31} disabled={!editing} className={inputClassName(!editing)} value={diaCorte} onChange={(e) => setDiaCorte(e.target.value)} />
        </FormField>
        <FormField label="Detección de anomalías">
          <label className="flex items-center gap-2 py-1.5">
            <input type="checkbox" disabled={!editing} checked={anomalyDetection} onChange={(e) => setAnomalyDetection(e.target.checked)} />
            <span className="text-graphite" style={{ fontSize: 12 }}>
              {anomalyDetection ? "Activa" : "Desactivada"}
            </span>
          </label>
        </FormField>
      </div>

      {editing && (
        <div className="flex items-center gap-2">
          <button type="button" disabled={pending} onClick={save} className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40" style={{ fontSize: 11, fontWeight: 800 }}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="button" onClick={reset} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
            Deshacer
          </button>
        </div>
      )}
      <Toast toast={toast} />
    </Card>
  );
}
