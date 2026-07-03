"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { formatCompact, formatFull } from "@/lib/format";
import { createRetentionRule, editRetentionRule, previewRetentionImpact } from "@/lib/retention-rule-actions";
import type { RetentionRuleFull, TipoRetencion, BaseCalculo } from "@/lib/retention-rule-data";

const TIPO_INFO: Record<TipoRetencion, { label: string; helper: string; baseDefault: BaseCalculo; tasaHelper: string }> = {
  fuente: {
    label: "Fuente",
    helper: "Se retiene sobre valor antes de IVA. Alto impacto — verifica actividad económica del proveedor.",
    baseDefault: "valor_base",
    tasaHelper: "Ejemplos: 2,5% servicios / 3,5% honorarios / 4% arrendamiento.",
  },
  ica: {
    label: "ICA",
    helper: "Municipal. Tasa varía por municipio y actividad. Común: 4,14×1000 para industria.",
    baseDefault: "valor_base",
    tasaHelper: "Ejemplo Pereira industria: 0,414% (4,14×1000).",
  },
  iva: {
    label: "IVA",
    helper: "Solo si Ferreinox es agente retenedor de IVA. Se calcula sobre el IVA facturado, no sobre el total.",
    baseDefault: "valor_iva",
    tasaHelper: "Estándar: 15% del IVA facturado.",
  },
  otros: {
    label: "Otros",
    helper: "Casos especiales: estampilla, timbre, contribuciones.",
    baseDefault: "valor_base",
    tasaHelper: "Define la tasa según el caso.",
  },
};

interface Props {
  providerId: number;
  existingRule?: RetentionRuleFull;
  hasActiveOfSameType?: boolean;
  defaultTipo?: TipoRetencion;
}

export function RetentionRuleModal({ providerId, existingRule, hasActiveOfSameType, defaultTipo }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [tipo, setTipo] = useState<TipoRetencion>(existingRule?.tipo_retencion ?? defaultTipo ?? "fuente");
  const [nombreRegla, setNombreRegla] = useState(existingRule?.nombre_regla ?? "");
  const [tasa, setTasa] = useState(existingRule ? String(existingRule.tasa * 100) : "2.5");
  const [baseCalculo, setBaseCalculo] = useState<BaseCalculo>(existingRule?.base_calculo ?? "valor_base");
  const [aplicaUmbral, setAplicaUmbral] = useState(Boolean(existingRule?.umbral_uvt || existingRule?.valor_minimo));
  const [umbralTipo, setUmbralTipo] = useState<"uvt" | "pesos">(existingRule?.valor_minimo ? "pesos" : "uvt");
  const [umbralUvt, setUmbralUvt] = useState(existingRule?.umbral_uvt ? String(existingRule.umbral_uvt) : "4");
  const [umbralPesos, setUmbralPesos] = useState(existingRule?.valor_minimo ? String(existingRule.valor_minimo) : "");
  const [acumuladoDiario, setAcumuladoDiario] = useState(existingRule?.aplica_acumulado_diario ?? true);
  const [preview, setPreview] = useState<{ facturas: number; retenido_potencial: number; umbral_pesos: number; uvt_vigente: number } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const tasaNum = Number(tasa) / 100;
    if (!tasaNum) {
      setPreview(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await previewRetentionImpact(providerId, {
          tasa: tasaNum,
          base_calculo: baseCalculo,
          umbral_uvt: aplicaUmbral && umbralTipo === "uvt" ? Number(umbralUvt) : null,
          valor_minimo: aplicaUmbral && umbralTipo === "pesos" ? Number(umbralPesos) : null,
          aplica_acumulado_diario: acumuladoDiario,
        });
        setPreview(result);
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, tasa, baseCalculo, aplicaUmbral, umbralTipo, umbralUvt, umbralPesos, acumuladoDiario, providerId]);

  function handleSubmit() {
    startTransition(async () => {
      try {
        const data = {
          tipo_retencion: tipo,
          tasa: Number(tasa) / 100,
          base_calculo: baseCalculo,
          nombre_regla: nombreRegla || null,
          umbral_uvt: aplicaUmbral && umbralTipo === "uvt" ? Number(umbralUvt) : null,
          valor_minimo: aplicaUmbral && umbralTipo === "pesos" ? Number(umbralPesos) : null,
          aplica_acumulado_diario: acumuladoDiario,
        };
        if (existingRule) {
          await editRetentionRule(existingRule.id, providerId, data);
          showToast({ kind: "success", message: "Regla actualizada. Facturas emitidas antes conservan la regla anterior." });
        } else {
          await createRetentionRule(providerId, data);
          showToast({ kind: "success", message: "Regla de retención agregada." });
        }
        setOpen(false);
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo guardar la regla." });
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
          <Plus size={13} /> Agregar
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={existingRule ? "Editar retención" : "Nueva retención"} width={520}>
        <div className="flex flex-col gap-3">
          {existingRule && (
            <div className="rounded-md border border-orange bg-cream px-3 py-2" style={{ fontSize: 10.5 }}>
              Al guardar se cerrará la regla vigente y se creará una nueva desde hoy. Facturas emitidas antes conservan la
              regla anterior ({(existingRule.tasa * 100).toFixed(2)}%).
            </div>
          )}
          {!existingRule && hasActiveOfSameType && (
            <div className="rounded-md border border-orange bg-cream px-3 py-2" style={{ fontSize: 10.5 }}>
              Este proveedor ya tiene una regla activa de tipo &quot;{TIPO_INFO[tipo].label}&quot;. Al guardar, se cerrará la
              vigente y se creará esta nueva. Facturas emitidas antes conservarán la regla vieja.
            </div>
          )}

          <FormField label="Tipo de retención">
            <select
              disabled={Boolean(existingRule)}
              className={inputClassName(Boolean(existingRule))}
              value={tipo}
              onChange={(e) => {
                const t = e.target.value as TipoRetencion;
                setTipo(t);
                setBaseCalculo(TIPO_INFO[t].baseDefault);
              }}
            >
              {Object.entries(TIPO_INFO).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </select>
            <span className="text-stone" style={{ fontSize: 9.5 }}>
              {TIPO_INFO[tipo].helper}
            </span>
          </FormField>

          <FormField label="Nombre (opcional)">
            <input className={inputClassName(false)} value={nombreRegla} onChange={(e) => setNombreRegla(e.target.value)} placeholder={`${TIPO_INFO[tipo].label} ${tasa || 0}%`} />
          </FormField>

          <FormField label="Tasa (%)">
            <input type="number" step={0.0001} min={0} max={100} className={inputClassName(false)} value={tasa} onChange={(e) => setTasa(e.target.value)} />
            <span className="text-stone" style={{ fontSize: 9.5 }}>
              {TIPO_INFO[tipo].tasaHelper}
            </span>
          </FormField>

          <FormField label="Base de cálculo">
            <select className={inputClassName(false)} value={baseCalculo} onChange={(e) => setBaseCalculo(e.target.value as BaseCalculo)}>
              <option value="valor_base">Valor base (antes de IVA)</option>
              <option value="valor_total">Valor total (con IVA)</option>
              <option value="valor_iva">Valor IVA</option>
            </select>
          </FormField>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={aplicaUmbral} onChange={(e) => setAplicaUmbral(e.target.checked)} />
            <span className="text-graphite" style={{ fontSize: 11 }}>
              ¿Aplica umbral mínimo?
            </span>
          </label>

          {aplicaUmbral && (
            <div className="rounded-md border border-line p-2.5">
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
                  <input type="radio" checked={umbralTipo === "uvt"} onChange={() => setUmbralTipo("uvt")} /> UVT (recomendado)
                </label>
                <label className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
                  <input type="radio" checked={umbralTipo === "pesos"} onChange={() => setUmbralTipo("pesos")} /> Pesos fijos
                </label>
              </div>
              {umbralTipo === "uvt" ? (
                <FormField label="Umbral en UVT">
                  <input type="number" step={0.5} className={inputClassName(false)} value={umbralUvt} onChange={(e) => setUmbralUvt(e.target.value)} />
                  {preview && <span className="text-stone" style={{ fontSize: 9.5 }}>Equivale a {formatFull(preview.umbral_pesos)} (UVT {formatFull(preview.uvt_vigente)})</span>}
                </FormField>
              ) : (
                <FormField label="Umbral en pesos">
                  <input type="number" className={inputClassName(false)} value={umbralPesos} onChange={(e) => setUmbralPesos(e.target.value)} />
                </FormField>
              )}
            </div>
          )}

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={acumuladoDiario} onChange={(e) => setAcumuladoDiario(e.target.checked)} />
            <span className="text-graphite" style={{ fontSize: 11 }}>
              Sumar facturas del mismo día del mismo proveedor
            </span>
          </label>
          <span className="text-stone" style={{ fontSize: 9.5, marginTop: -6 }}>
            Estándar Colombia: el umbral se compara contra el total del día, no por factura individual.
          </span>

          {preview && (
            <div className="rounded-md bg-parchment p-3">
              <p className="text-graphite" style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                Impacto estimado
              </p>
              <p className="text-stone" style={{ fontSize: 11 }}>
                Aplicaría hoy a <strong className="text-ink">{preview.facturas}</strong> facturas pendientes de este
                proveedor por un total retenido de <strong className="text-success">{formatCompact(preview.retenido_potencial)}</strong>.
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={pending || !tasa}
            onClick={handleSubmit}
            className="self-end rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {pending ? "Guardando…" : "Guardar regla"}
          </button>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
