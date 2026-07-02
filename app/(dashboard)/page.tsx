import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { AgingSwatch } from "@/components/ui/aging-swatch";
import { PaymentCalendarHeatmap, type HeatmapDay } from "@/components/dashboard/payment-calendar-heatmap";

const GREETING_DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function firstName(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

// Placeholder de estructura visual (Checkpoint 3a) -- sin datos reales todavia.
// Los valores y el heatmap se conectan a Postgres/PostgREST en Checkpoint 3b.
function placeholderHeatmapDays(): HeatmapDay[] {
  const pattern = [0, 0, 1, 2, 0, 3, 1, 0, 2, 4, 1, 0, 0, 1, 2, 3, 0, 1, 0, 2, 1, 0, 3, 2, 1, 0, 0, 1, 4, 2];
  const today = new Date();
  return pattern.map((intensity, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return {
      date: date.toISOString().slice(0, 10),
      intensity: intensity as HeatmapDay["intensity"],
      label: date.toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
    };
  });
}

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user.role ?? "gerencia";
  const email = session?.user.email ?? "";
  const today = GREETING_DATE_FORMAT.format(new Date());

  const canSeeOperativeActions = role === "tesoreria" || role === "admin";
  const isContabilidad = role === "contabilidad" || role === "admin";
  const isAdmin = role === "admin";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">
          Buenos días, {firstName(email)}.
        </h1>
        <p className="text-lg text-graphite capitalize">Hoy es {today}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Por pagar esta semana"
          value="$ 12.400.000"
          footer={<AgingSwatch counts={{ al_dia: 40, "1_14": 20, "15_30": 10, "31_60": 5, mas_60: 2 }} />}
        />
        <KPICard
          label="Ahorro capturable"
          value="$ 340.000"
          trend={{ direction: "up", label: "vigente hasta 15 jul" }}
          variant="success"
        />
        <KPICard label="Vencidas (críticas)" value="4 facturas" trend={{ direction: "down", label: "$ 890.000" }} />
        <KPICard label="Rebate mes proyectado" value="Escala 2 ✓" trend={{ direction: "up", label: "84% al siguiente escalón" }} />
      </div>

      <Card>
        <h2 className="mb-1 text-xl font-bold text-ink">Calendario de pagos</h2>
        <p className="mb-4 text-sm text-stone">Próximos 30 días</p>
        <PaymentCalendarHeatmap days={placeholderHeatmapDays()} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {canSeeOperativeActions && (
          <Card>
            <h2 className="mb-4 text-lg font-bold text-ink">Facturas urgentes</h2>
            <p className="text-sm text-stone">
              La tabla de facturas urgentes con acciones inline se conecta en Checkpoint 3b.
            </p>
          </Card>
        )}
        <Card>
          <h2 className="mb-4 text-lg font-bold text-ink">Top proveedores por volumen</h2>
          <p className="text-sm text-stone">Últimos 30 días — se conecta en Checkpoint 3b.</p>
        </Card>
      </div>

      {isContabilidad && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-2 text-lg font-bold text-ink">Descuentos por resolver</h2>
            <p className="text-sm text-stone">Se conecta en Checkpoint 3b.</p>
          </Card>
          <Card>
            <h2 className="mb-2 text-lg font-bold text-ink">Retenciones a revisar</h2>
            <p className="text-sm text-stone">Se conecta en Checkpoint 3b.</p>
          </Card>
        </div>
      )}

      {isAdmin && (
        <Card>
          <h2 className="mb-2 text-lg font-bold text-ink">Salud del sistema</h2>
          <p className="text-sm text-stone">
            Estados de IMAP, Dropbox, worker y backups — se conecta en Checkpoint 3b.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-xl font-bold text-ink">Progreso de rebates</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["Pintuco", "Abracol", "Goya"].map((name) => (
            <div key={name} className="rounded-md border border-line bg-parchment p-4">
              <p className="font-semibold text-ink">{name}</p>
              <p className="mt-1 text-sm text-stone">Se conecta en Checkpoint 3b.</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
