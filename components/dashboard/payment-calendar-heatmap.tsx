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

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const CELL_SIZE = 28;

export function PaymentCalendarHeatmap({ days }: PaymentCalendarHeatmapProps) {
  if (days.length === 0) return null;

  const firstDate = new Date(days[0].date);
  const isoWeekday = (firstDate.getDay() + 6) % 7;
  const leadingBlanks = Array.from({ length: isoWeekday }, (_, i) => `blank-${i}`);

  return (
    <div>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(7, ${CELL_SIZE}px)`, gap: 4, maxWidth: 7 * CELL_SIZE + 24 }}
      >
        {WEEKDAY_LABELS.map((wd) => (
          <span
            key={wd}
            className="text-center text-stone"
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em" }}
          >
            {wd}
          </span>
        ))}
        {leadingBlanks.map((key) => (
          <span key={key} />
        ))}
        {days.map((day) => {
          const dayNumber = new Date(day.date).getDate();
          return (
            <button
              key={day.date}
              title={day.label}
              className="group relative flex items-center justify-center rounded transition-transform duration-150 hover:z-10 hover:scale-125 hover:shadow-md focus-visible:outline-none focus-visible:shadow-glow-red"
              style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: INTENSITY_COLORS[day.intensity] }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: day.intensity >= 3 ? "rgba(255,255,255,0.9)" : "rgba(26,22,20,0.55)",
                }}
              >
                {dayNumber}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1" style={{ fontSize: 9 }}>
        <span className="text-stone">Menos</span>
        {INTENSITY_COLORS.map((color) => (
          <span key={color} className="rounded-sm" style={{ width: 10, height: 10, backgroundColor: color }} />
        ))}
        <span className="text-stone">Más</span>
      </div>
    </div>
  );
}
