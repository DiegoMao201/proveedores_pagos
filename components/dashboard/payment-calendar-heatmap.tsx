const INTENSITY_COLORS = [
  "var(--color-cream)",
  "var(--color-yellow)",
  "var(--color-orange)",
  "var(--color-red)",
  "var(--color-red-deep)",
];

export interface HeatmapDay {
  date: string;
  intensity: 0 | 1 | 2 | 3 | 4;
  label: string;
}

interface PaymentCalendarHeatmapProps {
  days: HeatmapDay[];
}

export function PaymentCalendarHeatmap({ days }: PaymentCalendarHeatmapProps) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-2 sm:grid-cols-15">
        {days.map((day) => (
          <button
            key={day.date}
            title={day.label}
            className="aspect-square rounded-sm transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:shadow-glow-red"
            style={{ backgroundColor: INTENSITY_COLORS[day.intensity] }}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-stone">
        <span>Menos</span>
        {INTENSITY_COLORS.map((color) => (
          <span key={color} className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
