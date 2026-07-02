import Link from "next/link";
import { AlertCircle, FileText, Wallet, CheckCircle2, PiggyBank, Wallet2, ArrowRight } from "lucide-react";
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
  getPaymentRunway,
  type DashboardKpis,
} from "@/lib/dashboard-data";
import type { AgingBucketKey } from "@/components/ui/aging-swatch";
import type { HeatmapDay } from "@/components/dashboard/payment-calendar-heatmap";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

export const revalidate = 300; // 5 minutos (E.: auto-refresh de KPIs)

const GREETING_DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function firstName(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function greetingByHour(): string {
  const hourBogota = Number(
    new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(new Date())
  );
  if (hourBogota < 12) return "Buenos días";
  if (hourBogota < 19) return "Buenas tardes";
  return "Buenas noches";
}

const REBATE_PROVIDERS = [
  { name: "Pintuco", href: "/rebate/pintuco", cycle: "Trimestral" },
  { name: "Abracol", href: "/rebate/abracol", cycle: "Bimestral" },
  { name: "Goya", href: "/rebate/goya", cycle: "Semestral" },
];

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user.role ?? "gerencia";
  const email = session?.user.email ?? "";
  const today = GREETING_DATE_FORMAT.format(new Date());

  const canSeeOperativeActions = role === "tesoreria" || role === "admin";
  const isContabilidad = role === "contabilidad" || role === "admin";
  const isAdmin = role === "admin";

  let kpis: DashboardKpis | null = null;
  let aging: Record<AgingBucketKey, number> | null = null;
  let heatmapDays: HeatmapDay[] = [];
  let discounts: { total: number; count: number; nearestDeadline: string | null } = {
    total: 0,
    count: 0,
    nearestDeadline: null,
  };
  let runway = { d7: 0, d15: 0, d30: 0 };
  let dataError: string | null = null;

  try {
    [kpis, aging, heatmapDays, discounts, runway] = await Promise.all([
      getDashboardKpis(),
      getPendingAging(),
      getPaymentCalendar(),
      getCapturableDiscountTotal(),
      getPaymentRunway(),
    ]);
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">
          {greetingByHour()}, {firstName(email)}.
        </h1>
        <p className="text-lg text-graphite capitalize">Hoy es {today}.</p>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar los indicadores en vivo. Verifica tu conexión y reintenta.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Facturas ingestadas (30d)"
              value={kpis!.facturas_ingestadas_30d.toLocaleString("es-CO")}
              icon={FileText}
              tone="info"
            />
            <KPICard
              label="Cartera pendiente"
              value={formatCurrency(kpis!.cartera_pendiente_total)}
              icon={Wallet}
              tone="orange"
              trend={{ direction: "up", label: `${kpis!.cartera_pendiente_count} facturas` }}
              footer={<AgingSwatch counts={aging!} />}
            />
            <KPICard
              label="Cartera saldada (30d)"
              value={formatCurrency(kpis!.cartera_saldada_30d_total)}
              icon={CheckCircle2}
              tone="success"
              trend={{ direction: "up", label: `${kpis!.cartera_saldada_30d_count} facturas` }}
            />
            <KPICard
              label="Ahorro capturable"
              value={formatCurrency(discounts.total)}
              icon={PiggyBank}
              tone="yellow"
              trend={{
                direction: "up",
                label: discounts.nearestDeadline
                  ? `${discounts.count} facturas, vence antes ${discounts.nearestDeadline}`
                  : "sin descuentos vigentes",
              }}
              variant="success"
            />
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line bg-parchment px-6 py-3">
              <Wallet2 size={16} className="text-red-deep" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-graphite">Payment runway — efectivo requerido</h2>
            </div>
            <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { label: "Próximos 7 días", value: runway.d7 },
                { label: "Próximos 15 días", value: runway.d15 },
                { label: "Próximos 30 días", value: runway.d30 },
              ].map((item) => (
                <div key={item.label} className="px-6 py-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone">{item.label}</p>
                  <p className="num mt-1 text-2xl font-extrabold text-ink">{formatCurrencyCompact(item.value)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-1 text-xl font-bold text-ink">Calendario de pagos</h2>
            <p className="mb-4 text-sm text-stone">Próximos 30 días — cartera pendiente por fecha de vencimiento</p>
            <PaymentCalendarHeatmap days={heatmapDays} />
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {canSeeOperativeActions && (
          <Card>
            <h2 className="mb-4 text-lg font-bold text-ink">Facturas urgentes</h2>
            <p className="text-sm text-stone">
              La tabla de facturas urgentes con acciones inline llega en el Bloque 2 (motor de alertas).
            </p>
          </Card>
        )}
        <Card>
          <h2 className="mb-4 text-lg font-bold text-ink">Top proveedores por volumen</h2>
          <p className="text-sm text-stone">Se conecta al construir el perfil de proveedor.</p>
        </Card>
      </div>

      {isContabilidad && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-2 text-lg font-bold text-ink">Descuentos por resolver</h2>
            <p className="text-sm text-stone">Llega con la gestión de descuentos del Bloque 2.</p>
          </Card>
          <Card>
            <h2 className="mb-2 text-lg font-bold text-ink">Retenciones a revisar</h2>
            <p className="text-sm text-stone">Llega con la gestión de retenciones del Bloque 2.</p>
          </Card>
        </div>
      )}

      {isAdmin && (
        <Card>
          <h2 className="mb-2 text-lg font-bold text-ink">Salud del sistema</h2>
          <p className="text-sm text-stone">
            Estados de IMAP, Dropbox, worker y backups — se conecta en el Bloque 3.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-xl font-bold text-ink">Progreso de rebates</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {REBATE_PROVIDERS.map((provider) => (
            <Link
              key={provider.name}
              href={provider.href}
              className="group flex flex-col justify-between rounded-md border border-line bg-parchment p-4 transition-colors hover:border-red hover:bg-cream/40"
            >
              <div>
                <p className="font-bold text-ink">{provider.name}</p>
                <p className="text-xs uppercase tracking-wide text-stone">{provider.cycle}</p>
              </div>
              <span className="mt-3 flex items-center gap-1 text-sm font-semibold text-red-deep opacity-0 transition-opacity group-hover:opacity-100">
                Ver detalle <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
