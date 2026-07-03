"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { formatCompact } from "@/lib/format";
import { createDiscountRule, editDiscountRule, previewDiscountImpact } from "@/lib/discount-rule-actions";
import type { DiscountRuleFull } from "@/lib/discount-rule-data";

interface Props {
  providerId: number;
  existingRule?: DiscountRuleFull;
}

export function DiscountRuleModal({ providerId, existingRule }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [diasMax, setDiasMax] = useState(existingRule ? String(existingRule.dias_max) : "15");
  const [tasa, setTasa] = useState(existingRule ? String(existingRule.tasa_descuento * 100) : "3");
  const [nombreRegla, setNombreRegla] = useState(existingRule?.nombre_regla ?? "");
  const [aplicaNc, setAplicaNc] = useState(existingRule?.aplica_a_notas_credito ?? false);
  const [preview, setPreview] = useState<{ facturas: number; ahorro_potencial: number } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const dias = Number(diasMax);
    const tasaNum = Number(tasa) / 100;
    if (!dias || !tasaNum) {
      setPreview(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await previewDiscountImpact(providerId, dias, tasaNum, existingRule?.id);
        setPreview(result);
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, diasMax, tasa, providerId, existingRule?.id]);

  function handleSubmit() {
    startTransition(async () => {
      try {
        const data = {
          dias_max: Number(diasMax),
          tasa_descuento: Number(tasa) / 100,
          nombre_regla: nombreRegla || null,
          aplica_a_notas_credito: aplicaNc,
        };
        if (existingRule) {
          await editDiscountRule(existingRule.id, providerId, existingRule.peldano_orden, data);
          showToast({ kind: "success", message: "Peldaño actualizado. Facturas emitidas antes conservan la regla anterior." });
        } else {
          await createDiscountRule(providerId, data);
          showToast({ kind: "success", message: "Peldaño agregado." });
        }
        setOpen(false);
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo guardar el peldaño." });
      }
    });
  }

  return (
    <>
      {existingRule ? (
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1 text-red-deep" style={{ fontSize: 10, fontWeight: 700 }}>
          <Pencil size={11} /> Editar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-graphite transition-colors hover:border-red"
          style={{ fontSize: 11, fontWeight: 700 }}
        >
          <Plus size={13} /> Agregar peldaño
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={existingRule ? "Editar peldaño" : "Nuevo peldaño de descuento"} width={460}>
        <div className="flex flex-col gap-3">
          {existingRule && (
            <div className="rounded-md border border-orange bg-cream px-3 py-2" style={{ fontSize: 10.5 }}>
              Al guardar se cerrará la regla vigente y se creará una nueva desde hoy. Facturas emitidas antes conservan la
              regla anterior ({(existingRule.tasa_descuento * 100).toFixed(1)}%).
            </div>
          )}
          <FormField label="Días máximos">
            <input type="number" min={1} max={365} className={inputClassName(false)} value={diasMax} onChange={(e) => setDiasMax(e.target.value)} />
            <span className="text-stone" style={{ fontSize: 9.5 }}>
              Días desde emisión de factura para aplicar este descuento.
            </span>
          </FormField>
          <FormField label="Tasa de descuento (%)">
            <input type="number" step={0.1} min={0.1} max={20} className={inputClassName(false)} value={tasa} onChange={(e) => setTasa(e.target.value)} />
            <span className="text-stone" style={{ fontSize: 9.5 }}>
              Porcentaje sobre valor base (antes de IVA).
            </span>
          </FormField>
          <FormField label="Nombre de la regla (opcional)">
            <input
              className={inputClassName(false)}
              value={nombreRegla}
              onChange={(e) => setNombreRegla(e.target.value)}
              placeholder={`${tasa || 0}% a ${diasMax || 0}d`}
            />
          </FormField>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={aplicaNc} onChange={(e) => setAplicaNc(e.target.checked)} />
            <span className="text-graphite" style={{ fontSize: 11 }}>
              Aplica a notas crédito
            </span>
          </label>

          {preview && (
            <div className="rounded-md bg-parchment p-3">
              <p className="text-graphite" style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                Preview del impacto
              </p>
              <p className="text-stone" style={{ fontSize: 11 }}>
                Este peldaño aplicaría a <strong className="text-ink">{preview.facturas}</strong> facturas actualmente
                pendientes de este proveedor.
              </p>
              <p className="text-stone" style={{ fontSize: 11 }}>
                Ahorro potencial capturable: <strong className="text-success">{formatCompact(preview.ahorro_potencial)}</strong>
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={pending || !diasMax || !tasa}
            onClick={handleSubmit}
            className="self-end rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {pending ? "Guardando…" : "Guardar peldaño"}
          </button>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
