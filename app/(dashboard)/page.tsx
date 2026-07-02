import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { AgingSwatch } from "@/components/ui/aging-swatch";
import { PaymentCalendarHeatmap } from "@/components/dashboard/payment-calendar-heatmap";
import {
  getDashboardKpis,
  getPendingAging,
  getPaymentCalendar,
  getCapturableDiscountTotal,
} from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format";

export const revalidate = 300; // 5 minutos (E.: auto-refresh de KPIs)

const GREETING_DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function firstName(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user.role ?? "gerencia";
  const email = session?.user.email ?? "";
  const today = GREETING_DATE_FORMAT.format(new Date());

  const canSeeOperativeActions = role === "tesoreria" || role === "admin";
  const isContabilidad = role === "contabilidad" || role === "admin";
  const isAdmin = role === "admin";

  const [kpis, aging, heatmapDays, discounts] = await Promise.all([
    getDashboardKpis(),
    getPendingAging(),
    getPaymentCalendar(),
    getCapturableDiscountTotal(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Buenos días, {firstName(email)}.</h1>
        <p className="text-lg text-graphite capitalize">Hoy es {today}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Facturas ingestadas (30d)"
          value={kpis.facturas_ingestadas_30d.toLocaleString("es-CO")}
        />
        <KPICard
          label="Cartera pendiente"
          value={formatCurrency(kpis.cartera_pendiente_total)}
          trend={{ direction: "up", label: `${kpis.cartera_pendiente_count} facturas` }}
          footer={<AgingSwatch counts={aging} />}
        />
        <KPICard
          label="Cartera saldada (30d)"
          value={formatCurrency(kpis.cartera_saldada_30d_total)}
          trend={{ direction: "up", label: `${kpis.cartera_saldada_30d_count} facturas` }}
        />
        <KPICard
          label="Ahorro capturable"
          value={formatCurrency(discounts.total)}
          trend={{
            direction: "up",
            label: discounts.nearestDeadline
              ? `${discounts.count} facturas, vence antes ${discounts.nearestDeadline}`
              : "sin descuentos vigentes",
          }}
          variant="success"
        />
      </div>

      <Card>
        <h2 className="mb-1 text-xl font-bold text-ink">Calendario de pagos</h2>
        <p className="mb-4 text-sm text-stone">Próximos 30 días — cartera pendiente por fecha de vencimiento</p>
        <PaymentCalendarHeatmap days={heatmapDays} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {canSeeOperativeActions && (
          <Card>
            <h2 className="mb-4 text-lg font-bold text-ink">Facturas urgentes</h2>
            <p className="text-sm text-stone">
              La tabla de facturas urgentes con acciones inline llega en Iteración 4 (motor de alertas).
            </p>
          </Card>
        )}
        <Card>
          <h2 className="mb-4 text-lg font-bold text-ink">Top proveedores por volumen</h2>
          <p className="text-sm text-stone">Se conecta al construir la vista de Proveedores (Checkpoint 3f).</p>
        </Card>
      </div>

      {isContabilidad && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-2 text-lg font-bold text-ink">Descuentos por resolver</h2>
            <p className="text-sm text-stone">Llega con la gestión de descuentos de Iteración 3.</p>
          </Card>
          <Card>
            <h2 className="mb-2 text-lg font-bold text-ink">Retenciones a revisar</h2>
            <p className="text-sm text-stone">Llega con la gestión de retenciones de Iteración 3.</p>
          </Card>
        </div>
      )}

      {isAdmin && (
        <Card>
          <h2 className="mb-2 text-lg font-bold text-ink">Salud del sistema</h2>
          <p className="text-sm text-stone">
            Estados de IMAP, Dropbox, worker y backups — se conecta en Iteración 6.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-xl font-bold text-ink">Progreso de rebates</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["Pintuco", "Abracol", "Goya"].map((name) => (
            <div key={name} className="rounded-md border border-line bg-parchment p-4">
              <p className="font-semibold text-ink">{name}</p>
              <p className="mt-1 text-sm text-stone">Se construye en Iteración 2.</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
