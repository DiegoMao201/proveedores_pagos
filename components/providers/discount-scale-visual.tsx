import type { DiscountRuleFull } from "@/lib/discount-rule-data";

export function DiscountScaleVisual({ rules }: { rules: DiscountRuleFull[] }) {
  if (rules.length === 0) return null;
  const sorted = [...rules].sort((a, b) => a.dias_max - b.dias_max);
  const maxDias = sorted[sorted.length - 1].dias_max;

  return (
    <div className="rounded-lg bg-parchment p-3">
      <p className="text-graphite" style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
        Al pagar antes de:
      </p>
      <div className="flex flex-wrap gap-2">
        {sorted.map((r) => (
          <div key={r.id} className="rounded-md border border-yellow bg-cream-soft text-center" style={{ padding: "8px 14px", minWidth: 78 }}>
            <p className="num text-ink" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
              {r.dias_max}
            </p>
            <p className="text-graphite" style={{ fontSize: 10 }}>
              días
            </p>
            <p className="num text-success" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
              {(r.tasa_descuento * 100).toFixed(1)}%
            </p>
          </div>
        ))}
        <div
          className="rounded-md text-center"
          style={{ padding: "8px 14px", minWidth: 88, border: "1px dashed var(--color-stone)", background: "var(--color-line-soft, transparent)" }}
        >
          <p className="text-stone" style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>
            {`> ${maxDias} días`}
          </p>
          <p className="text-stone" style={{ fontSize: 10 }}>
            Sin descuento
          </p>
        </div>
      </div>
      <p className="text-graphite" style={{ fontSize: 10, marginTop: 8 }}>
        Descuento se aplica sobre valor base (antes de IVA).
      </p>
    </div>
  );
}
