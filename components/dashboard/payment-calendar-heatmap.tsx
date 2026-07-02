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

export function PaymentCalendarHeatmap({ days }: PaymentCalendarHeatmapProps) {
  if (days.length === 0) return null;

  // Alinear el primer dia a su posicion real de la semana (lunes = 0) para que
  // se lea como un calendario real, no una cinta continua de casillas.
  const firstDate = new Date(days[0].date);
  const isoWeekday = (firstDate.getDay() + 6) % 7;
  const leadingBlanks = Array.from({ length: isoWeekday }, (_, i) => `blank-${i}`);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((wd) => (
          <span key={wd} className="text-center text-[10px] font-bold uppercase tracking-wide text-stone/60">
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
              className="group relative aspect-square rounded-md transition-transform duration-150 hover:z-10 hover:scale-125 hover:shadow-md focus-visible:outline-none focus-visible:shadow-glow-red"
              style={{ backgroundColor: INTENSITY_COLORS[day.intensity] }}
            >
              <span
                className={`absolute bottom-0.5 right-1 text-[9px] font-bold ${
                  day.intensity >= 3 ? "text-white/85" : "text-ink/50"
                }`}
              >
                {dayNumber}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5 text-[11px] text-stone">
        <span>Menos actividad</span>
        {INTENSITY_COLORS.map((color) => (
          <span key={color} className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        <span>Más actividad</span>
      </div>
    </div>
  );
}
