import { formatCompact } from "@/lib/format";

interface KPIItem {
  label: string;
  labelColor: string;
  value: string;
  valueColor?: string;
  sub: string;
}

interface ProviderKPIGridProps {
  porPagar: { total: number; count: number };
  porConciliar: { count: number; total: number };
  capturable: number;
  rebateLabel: string;
}

export function ProviderKPIGrid({ porPagar, porConciliar, capturable, rebateLabel }: ProviderKPIGridProps) {
  const items: KPIItem[] = [
    {
      label: "POR PAGAR",
      labelColor: "var(--color-red-deep)",
      value: formatCompact(porPagar.total),
      sub: `${porPagar.count} facturas`,
    },
    {
      label: "POR CONCILIAR",
      labelColor: "var(--color-orange)",
      value: String(porConciliar.count),
      sub: `${formatCompact(porConciliar.total)} en revisión`,
    },
    {
      label: "CAPTURABLE",
      labelColor: "var(--color-success)",
      value: formatCompact(capturable),
      valueColor: "var(--color-success)",
      sub: "descuento pronto pago",
    },
    {
      label: "REBATE",
      labelColor: "var(--color-stone)",
      value: rebateLabel,
      sub: "ciclo vigente",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4" style={{ marginBottom: 10 }}>
      {items.map((item) => (
        <div key={item.label} className="border border-line bg-paper" style={{ borderRadius: 8, padding: "8px 10px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: item.labelColor }}>
            {item.label}
          </p>
          <p className="num" style={{ fontWeight: 700, fontSize: 15, color: item.valueColor ?? "var(--color-ink)" }}>
            {item.value}
          </p>
          <p style={{ fontSize: 9, color: "var(--color-graphite)" }}>{item.sub}</p>
        </div>
      ))}
    </div>
  );
}
