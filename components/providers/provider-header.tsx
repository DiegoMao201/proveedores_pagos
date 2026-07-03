import { FileDigit, CalendarClock, Mail } from "lucide-react";
import { HealthBadge } from "@/components/providers/health-badge";
import { formatCompact } from "@/lib/format";

interface DiscountChipRule {
  dias_max: number;
  tasa_descuento: number;
}

interface ProviderHeaderProps {
  nombre: string;
  nif: string | null;
  plazoPagoDias: number | null;
  discountRules: DiscountChipRule[];
  emailPago: string | null;
  healthScore: number;
  facturacion12m: number;
}

export function ProviderHeader({
  nombre,
  nif,
  plazoPagoDias,
  discountRules,
  emailPago,
  healthScore,
  facturacion12m,
}: ProviderHeaderProps) {
  const initial = nombre.trim().charAt(0).toUpperCase();

  return (
    <div
      className="grid items-center border"
      style={{
        background: "linear-gradient(135deg, var(--color-paper) 0%, var(--color-cream) 100%)",
        borderColor: "var(--color-yellow)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        gridTemplateColumns: "auto 1fr auto",
        gap: 14,
      }}
    >
      <div
        className="flex items-center justify-center text-white"
        style={{ width: 52, height: 52, borderRadius: 12, background: "var(--color-red)" }}
      >
        <span style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 22 }}>{initial}</span>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h1
            className="text-ink"
            style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em" }}
          >
            {nombre}
          </h1>
          <HealthBadge score={healthScore} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center text-graphite" style={{ gap: 14 }}>
          {nif && (
            <span className="flex items-center gap-1" style={{ fontSize: 10 }}>
              <FileDigit size={11} /> {nif}
            </span>
          )}
          {plazoPagoDias != null && (
            <span className="flex items-center gap-1" style={{ fontSize: 10 }}>
              <CalendarClock size={11} /> Plazo {plazoPagoDias}d
            </span>
          )}
          {emailPago && (
            <span className="flex items-center gap-1" style={{ fontSize: 10 }}>
              <Mail size={11} /> {emailPago}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center" style={{ gap: 5 }}>
          <span className="text-stone" style={{ fontSize: 9, fontWeight: 700 }}>
            Descuentos:
          </span>
          {discountRules.length === 0 ? (
            <span className="text-stone" style={{ fontSize: 10 }}>
              Sin descuentos configurados
            </span>
          ) : (
            [...discountRules]
              .sort((a, b) => a.dias_max - b.dias_max)
              .map((r) => (
                <span
                  key={r.dias_max}
                  className="inline-flex items-center rounded-full bg-cream-soft text-red-deep"
                  style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px" }}
                >
                  {(r.tasa_descuento * 100).toFixed(0)}%·{r.dias_max}d
                </span>
              ))
          )}
        </div>
      </div>

      <div className="text-right">
        <p className="text-stone" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>
          FACTURACIÓN 12M
        </p>
        <p className="num text-ink" style={{ fontWeight: 700, fontSize: 17 }}>
          {formatCompact(facturacion12m)}
        </p>
      </div>
    </div>
  );
}
