import { Card } from "@/components/ui/card";
import { DiscountScaleVisual } from "@/components/providers/discount-scale-visual";
import { DiscountRuleModal } from "@/components/providers/discount-rule-modal";
import { DeactivateDiscountRuleModal } from "@/components/providers/deactivate-discount-rule-modal";
import { DiscountHistoryToggle } from "@/components/providers/discount-history-toggle";
import { formatDateEs } from "@/lib/format";
import type { DiscountRuleFull } from "@/lib/discount-rule-data";

export function DiscountRulesTab({
  providerId,
  activeRules,
  inactiveRules,
  canEdit,
}: {
  providerId: number;
  activeRules: DiscountRuleFull[];
  inactiveRules: DiscountRuleFull[];
  canEdit: boolean;
}) {
  if (activeRules.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 border-yellow bg-cream-soft py-6 text-center">
        <p className="text-graphite" style={{ fontSize: 12, fontWeight: 700 }}>
          Este proveedor no tiene reglas de descuento configuradas.
        </p>
        <p className="max-w-md text-stone" style={{ fontSize: 11 }}>
          Si el proveedor ofrece descuento por pronto pago, agrega una regla para que la app calcule automáticamente el
          ahorro capturable al armar lotes de pago.
        </p>
        {canEdit && <DiscountRuleModal providerId={providerId} />}
        {inactiveRules.length > 0 && (
          <div className="mt-2 w-full">
            <DiscountHistoryToggle providerId={providerId} rules={inactiveRules} />
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12 }}>
          Descuentos por pronto pago
        </h2>
        {canEdit && <DiscountRuleModal providerId={providerId} />}
      </div>

      <DiscountScaleVisual rules={activeRules} />

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 11 }}>
            <thead>
              <tr className="border-b border-line bg-parchment text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th className="px-3 py-2 text-left">Peldaño</th>
                <th className="px-3 py-2 text-right">Días máx</th>
                <th className="px-3 py-2 text-right">Tasa</th>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Vigencia desde</th>
                <th className="px-3 py-2 text-left">Estado</th>
                {canEdit && <th className="px-3 py-2 text-left">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {activeRules.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="num px-3 py-2 text-ink">{r.peldano_orden}</td>
                  <td className="num px-3 py-2 text-right text-ink">{r.dias_max}</td>
                  <td className="num px-3 py-2 text-right text-ink">{(r.tasa_descuento * 100).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-stone">{r.nombre_regla ?? "—"}</td>
                  <td className="px-3 py-2 text-stone">{formatDateEs(r.valid_from)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 font-semibold text-success" style={{ fontSize: 10 }}>
                      Activa
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <DiscountRuleModal providerId={providerId} existingRule={r} />
                        <DeactivateDiscountRuleModal providerId={providerId} rule={r} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {inactiveRules.length > 0 && <DiscountHistoryToggle providerId={providerId} rules={inactiveRules} />}
    </div>
  );
}
