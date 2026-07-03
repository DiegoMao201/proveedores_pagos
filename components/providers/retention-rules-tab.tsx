import { Card } from "@/components/ui/card";
import { AutoretenedorSwitch } from "@/components/providers/autoretenedor-switch";
import { RetentionRuleModal } from "@/components/providers/retention-rule-modal";
import { DeactivateRetentionRuleModal } from "@/components/providers/deactivate-retention-rule-modal";
import { RetentionHistoryToggle } from "@/components/providers/retention-history-toggle";
import { formatDateEs } from "@/lib/format";
import type { RetentionRuleFull, TipoRetencion } from "@/lib/retention-rule-data";

const TIPO_ORDER: TipoRetencion[] = ["fuente", "ica", "iva", "otros"];
const TIPO_LABEL: Record<TipoRetencion, string> = {
  fuente: "Retención en la fuente",
  ica: "Retención ICA",
  iva: "Retención IVA",
  otros: "Otras retenciones",
};

export function RetentionRulesTab({
  providerId,
  esAutoretenedor,
  activeRules,
  inactiveRules,
  canEdit,
}: {
  providerId: number;
  esAutoretenedor: boolean;
  activeRules: RetentionRuleFull[];
  inactiveRules: RetentionRuleFull[];
  canEdit: boolean;
}) {
  const rulesByTipo = TIPO_ORDER.map((tipo) => ({
    tipo,
    rules: activeRules.filter((r) => r.tipo_retencion === tipo),
  }));

  return (
    <div className="flex flex-col gap-3">
      <AutoretenedorSwitch providerId={providerId} initialValue={esAutoretenedor} canEdit={canEdit} />

      {activeRules.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 border-dashed py-6 text-center" style={{ borderStyle: "dashed" }}>
          <p className="text-graphite" style={{ fontSize: 12, fontWeight: 700 }}>
            Este proveedor no tiene reglas de retención configuradas.
          </p>
          <p className="max-w-md text-stone" style={{ fontSize: 11 }}>
            Si Ferreinox debe retener a este proveedor, configura las reglas aplicables aquí.
          </p>
          {canEdit && <RetentionRuleModal providerId={providerId} />}
        </Card>
      ) : (
        rulesByTipo.map(({ tipo, rules }) => {
          if (rules.length === 0 && !canEdit) return null;
          return (
            <div key={tipo}>
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-ink" style={{ fontWeight: 800, fontSize: 12 }}>
                  {TIPO_LABEL[tipo]}
                </h3>
                {canEdit && rules.length === 0 && <RetentionRuleModal providerId={providerId} defaultTipo={tipo} />}
              </div>
              {rules.length === 0 ? (
                <p className="text-stone" style={{ fontSize: 11 }}>
                  Sin regla configurada.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {rules.map((r) => (
                    <Card key={r.id}>
                      <div className="flex items-center justify-between">
                        <p className="text-ink" style={{ fontWeight: 700, fontSize: 12 }}>
                          {r.nombre_regla ?? `${TIPO_LABEL[tipo]} ${(r.tasa * 100).toFixed(2)}%`}
                        </p>
                        {canEdit && (
                          <div className="flex items-center gap-2">
                            <RetentionRuleModal providerId={providerId} existingRule={r} hasActiveOfSameType />
                            <DeactivateRetentionRuleModal providerId={providerId} rule={r} />
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-cream-soft px-2 py-0.5 font-semibold text-red-deep" style={{ fontSize: 10 }}>
                          Tasa: {(r.tasa * 100).toFixed(2)}%
                        </span>
                        <span className="inline-flex items-center rounded-full bg-line px-2 py-0.5 font-semibold text-graphite" style={{ fontSize: 10 }}>
                          Base: {r.base_calculo === "valor_base" ? "Valor base" : r.base_calculo === "valor_total" ? "Valor total" : "Valor IVA"}
                        </span>
                        {(r.umbral_uvt || r.valor_minimo) && (
                          <span className="inline-flex items-center rounded-full bg-line px-2 py-0.5 font-semibold text-graphite" style={{ fontSize: 10 }}>
                            Umbral: {r.umbral_uvt ? `${r.umbral_uvt} UVT` : `$${r.valor_minimo?.toLocaleString("es-CO")}`}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-line px-2 py-0.5 font-semibold text-graphite" style={{ fontSize: 10 }}>
                          Acumulado diario: {r.aplica_acumulado_diario ? "Sí" : "No"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-line px-2 py-0.5 font-semibold text-graphite" style={{ fontSize: 10 }}>
                          Vigente desde: {formatDateEs(r.valid_from)}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {inactiveRules.length > 0 && <RetentionHistoryToggle providerId={providerId} rules={inactiveRules} />}
    </div>
  );
}
