import { ArrowRight } from "lucide-react";

interface SuggestedActionProps {
  title: string;
  metadata: string;
  daysLeft: number;
  ctaLabel: string;
}

export function SuggestedAction({ title, metadata, daysLeft, ctaLabel }: SuggestedActionProps) {
  return (
    <div
      className="grid items-center text-white"
      style={{
        background: "var(--color-red-deep)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        gridTemplateColumns: "1fr auto auto",
        gap: 14,
      }}
    >
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", opacity: 0.85 }}>
          ACCIÓN SUGERIDA HOY
        </p>
        <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 14, lineHeight: 1.3, marginTop: 2 }}>
          {title}
        </p>
        <p className="num" style={{ fontSize: 10, opacity: 0.9, marginTop: 4 }}>
          {metadata}
        </p>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.16)",
          borderRadius: 8,
          padding: "8px 12px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 9, opacity: 0.85, fontWeight: 700 }}>DÍAS RESTANTES</p>
        <p className="num" style={{ fontWeight: 800, fontSize: 22 }}>
          {daysLeft}
        </p>
      </div>

      <button
        className="flex items-center gap-1 transition-colors"
        style={{
          background: "white",
          color: "var(--color-red-deep)",
          padding: "10px 16px",
          borderRadius: 8,
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        {ctaLabel}
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
