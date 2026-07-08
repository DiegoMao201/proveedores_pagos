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
  getPaymentRunway,
  getDashboardOperationalData,
  getSystemHealth,
  type DashboardKpis,
  type UrgentInvoiceRow,
  type TopProviderRow,
  type PendingDiscountRow,
  type RetentionToReviewRow,
  type SystemHealthRow,
} from "@/lib/dashboard-data";
import { getCapturableDiscountTotal } from "@/lib/discount-data";
import { getRebateDashboardSummary, type RebateSummary } from "@/lib/rebate-data";
import { getUnknownProviders, type UnknownProviderRow } from "@/lib/bank-account-data";
import { UrgentInvoicesCard } from "@/components/dashboard/urgent-invoices-card";
import { TopProvidersCard } from "@/components/dashboard/top-providers-card";
import { PendingDiscountsCard } from "@/components/dashboard/pending-discounts-card";
import { RetentionsReviewCard } from "@/components/dashboard/retentions-review-card";
import { SystemHealthCard } from "@/components/dashboard/system-health-card";
import { UnknownProvidersAlert } from "@/components/dashboard/unknown-providers-alert";
import type { AgingBucketKey } from "@/components/ui/aging-swatch";
import type { HeatmapDay } from "@/components/dashboard/payment-calendar-heatmap";
import { formatCompact, formatTodayEs } from "@/lib/format";

export const revalidate = 300; // 5 minutos (E.: auto-refresh de KPIs)

function firstName(name: string | null | undefined, email: string) {
  if (name) return name.split(" ")[0];
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

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user.role ?? "gerencia";
  const email = session?.user.email ?? "";
  const today = formatTodayEs();

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
  let rebateSummary: RebateSummary[] = [];

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

  try {
    rebateSummary = await getRebateDashboardSummary();
  } catch {
    rebateSummary = [];
  }

  let urgentInvoices: UrgentInvoiceRow[] = [];
  let topProviders: TopProviderRow[] = [];
  let pendingDiscounts: PendingDiscountRow[] = [];
  let retentionsToReview: RetentionToReviewRow[] = [];
  let systemHealth: SystemHealthRow[] = [];
  let unknownProviders: UnknownProviderRow[] = [];

  try {
    const [operational, health, unknown] = await Promise.all([
      getDashboardOperationalData(),
      isAdmin ? getSystemHealth() : Promise.resolve([]),
      isAdmin ? getUnknownProviders() : Promise.resolve([]),
    ]);
    urgentInvoices = operational.urgentInvoices;
    topProviders = operational.topProviders;
    pendingDiscounts = operational.pendingDiscounts;
    retentionsToReview = operational.retentionsToReview;
    systemHealth = health;
    unknownProviders = unknown;
  } catch {
    // Estas cards son informativas -- si fallan, no rompen el resto de /inicio.
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
          {greetingByHour()}, {firstName(session?.user.name, email)}.
        </h1>
        <p className="text-graphite" style={{ fontSize: 12 }}>
          {today}.
        </p>
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
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <KPICard
              label="Facturas 30d"
              value={kpis!.facturas_ingestadas_30d.toLocaleString("es-CO")}
              icon={FileText}
              tone="info"
            />
            <KPICard
              label="Cartera pendiente"
              value={formatCompact(kpis!.cartera_pendiente_total)}
              icon={Wallet}
              tone="orange"
              trend={{ direction: "up", label: `${kpis!.cartera_pendiente_count} facturas` }}
              footer={<AgingSwatch counts={aging!} />}
            />
            <KPICard
              label="Cartera saldada 30d"
              value={formatCompact(kpis!.cartera_saldada_30d_total)}
              icon={CheckCircle2}
              tone="success"
              trend={{ direction: "up", label: `${kpis!.cartera_saldada_30d_count} facturas` }}
            />
            <KPICard
              label="Ahorro capturable"
              value={formatCompact(discounts.total)}
              icon={PiggyBank}
              tone="yellow"
              trend={{
                direction: "up",
                label: discounts.nearestDeadline
                  ? `${discounts.count} facturas · vence ${discounts.nearestDeadline}`
                  : "sin descuentos vigentes",
              }}
            />
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
              <Wallet2 size={13} className="text-red-deep" />
              <h2 className="text-graphite" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Payment runway — efectivo requerido
              </h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line">
              {[
                { label: "Próximos 7 días", value: runway.d7 },
                { label: "Próximos 15 días", value: runway.d15 },
                { label: "Próximos 30 días", value: runway.d30 },
              ].map((item) => (
                <div key={item.label} style={{ padding: "10px 14px" }}>
                  <p className="text-stone" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {item.label}
                  </p>
                  <p className="num text-ink" style={{ fontWeight: 800, fontSize: 17, marginTop: 2 }}>
                    {formatCompact(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 13 }}>
              Calendario de pagos
            </h2>
            <p className="text-stone" style={{ fontSize: 10, marginBottom: 10 }}>
              Próximos 30 días — cartera pendiente por fecha de vencimiento
            </p>
            <PaymentCalendarHeatmap days={heatmapDays} />
          </Card>
        </>
      )}

      {isAdmin && <UnknownProvidersAlert rows={unknownProviders} />}

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {canSeeOperativeActions && <UrgentInvoicesCard invoices={urgentInvoices} />}
        <TopProvidersCard providers={topProviders} />
      </div>

      {isContabilidad && (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          <PendingDiscountsCard discounts={pendingDiscounts} />
          <RetentionsReviewCard retentions={retentionsToReview} />
        </div>
      )}

      {isAdmin && <SystemHealthCard health={systemHealth} />}

      <Card>
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
          Progreso de rebates
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(rebateSummary.length > 0
            ? rebateSummary
            : [
                { provider: "pintuco", label: "Pintuco", cycle: "Trimestral", href: "/rebate/pintuco" },
                { provider: "abracol", label: "Abracol", cycle: "Bimestral", href: "/rebate/abracol" },
                { provider: "goya", label: "Goya", cycle: "Semestral", href: "/rebate/goya" },
              ]
          ).map((provider) => (
            <Link
              key={provider.provider}
              href={provider.href}
              className="group flex flex-col justify-between border border-line bg-parchment transition-colors hover:border-red hover:bg-cream-soft"
              style={{ borderRadius: 8, padding: 10 }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-ink" style={{ fontWeight: 700, fontSize: 12 }}>
                    {provider.label}
                  </p>
                  <p className="text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {provider.cycle}
                  </p>
                </div>
                {"gananciaAcumulada" in provider && (
                  <p className="num text-ink" style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>
                    {formatCompact(provider.gananciaAcumulada)}
                  </p>
                )}
                {"currentPeriodLabel" in provider && (
                  <p className="text-stone" style={{ fontSize: 10, marginTop: 2 }}>
                    {provider.currentPeriodLabel} · {provider.currentPeriodPct ?? 0}% de escala
                  </p>
                )}
              </div>
              <span
                className="flex items-center gap-1 text-red-deep opacity-0 transition-opacity group-hover:opacity-100"
                style={{ fontSize: 10, fontWeight: 700, marginTop: 6 }}
              >
                Ver detalle <ArrowRight size={11} />
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
