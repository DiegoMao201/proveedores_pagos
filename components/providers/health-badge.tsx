interface HealthBadgeProps {
  score: number;
}

function healthTone(score: number) {
  if (score >= 85) return { label: "Excelente", bg: "var(--color-success-soft)", fg: "var(--color-success)" };
  if (score >= 70) return { label: "Bueno", bg: "var(--color-cream-soft)", fg: "var(--color-graphite)" };
  if (score >= 50) return { label: "Aceptable", bg: "#FEEFD9", fg: "#8A5820" };
  return { label: "Requiere atención", bg: "#FCEBEB", fg: "var(--color-red-deep)" };
}

export function HealthBadge({ score }: HealthBadgeProps) {
  const tone = healthTone(score);
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        background: tone.bg,
        color: tone.fg,
        fontSize: 9,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 999,
      }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: tone.fg }} />
      {tone.label}
    </span>
  );
}
