import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { ProviderSelector } from "@/components/providers/provider-selector";
import { ProviderHeader } from "@/components/providers/provider-header";
import { ProviderKPIGrid } from "@/components/providers/provider-kpi-grid";
import { SectionTabs } from "@/components/rebate/section-tabs";
import { EditableBasicsForm } from "@/components/providers/editable-basics-form";
import { EditableConditionsForm } from "@/components/providers/editable-conditions-form";
import { EditableContactsForm } from "@/components/providers/editable-contacts-form";
import { BankAccountsTab } from "@/components/providers/bank-accounts-tab";
import { ProviderHistoryTab } from "@/components/providers/provider-history-tab";
import { DiscountRulesTab } from "@/components/providers/discount-rules-tab";
import { RetentionRulesTab } from "@/components/providers/retention-rules-tab";
import { ProviderInvoiceWorkspace } from "@/components/providers/provider-invoice-workspace";
import {
  getProviderById,
  getProviderFull,
  listProviders,
  getProviderInvoiceSummary,
  getProviderHistory,
} from "@/lib/provider-detail-data";
import { getActiveDiscountRulesFull, getInactiveDiscountRules } from "@/lib/discount-rule-data";
import { getActiveRetentionRules, getInactiveRetentionRules } from "@/lib/retention-rule-data";
import { getBankAccounts, getBankCatalog } from "@/lib/bank-account-data";
import { getCapturableDiscountTotal } from "@/lib/discount-data";
import { getProviderInvoicesWithCalc, getOwnBankAccounts, getProviderReconciling, getProviderPaid, getDataFreshness } from "@/lib/batch-data";

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// Score de salud simplificado para este checkpoint: completitud de datos del
// maestro. El score compuesto completo (puntualidad + captura de descuentos +
// calidad + volumen, plan maestro seccion C.6) requiere historial de pagos que
// todavia no existe en Postgres (los pagos reales viven solo en el ERP externo).
function simplifiedHealthScore(fields: (string | number | null)[]): number {
  const filled = fields.filter((f) => f !== null && f !== "").length;
  return Math.round(60 + (filled / fields.length) * 40);
}

export default async function ProviderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const providerId = Number(id);
  const session = await auth();
  const canEdit = session?.user.role === "admin" || session?.user.role === "tesoreria" || session?.user.role === "contabilidad";

  let dataError: string | null = null;
  const provider = await getProviderById(providerId).catch((e) => {
    dataError = e instanceof Error ? e.message : "Error desconocido";
    return null;
  });

  if (!dataError && !provider) {
    notFound();
  }

  if (dataError || !provider) {
    return (
      <Card className="border-red-deep bg-cream">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
          <AlertCircle size={16} />
          No pudimos cargar este proveedor. {dataError}
        </p>
      </Card>
    );
  }

  const firstWord = provider.nombre.split(" ")[0];
  const fechaPago = tomorrowIso();

  const [
    allProviders,
    activeDiscountRules,
    inactiveDiscountRules,
    activeRetentionRules,
    inactiveRetentionRules,
    invoiceSummary,
    discounts,
    providerFull,
    bankAccounts,
    bankCatalog,
    history,
    invoicesWithCalc,
    ownAccounts,
    reconciling,
    paid,
    freshness,
  ] = await Promise.all([
    listProviders(),
    getActiveDiscountRulesFull(provider.id),
    getInactiveDiscountRules(provider.id),
    getActiveRetentionRules(provider.id),
    getInactiveRetentionRules(provider.id),
    getProviderInvoiceSummary(provider.nombre_normalizado),
    getCapturableDiscountTotal(),
    getProviderFull(provider.id),
    getBankAccounts(provider.id),
    getBankCatalog(),
    getProviderHistory(provider.id, 20, 0),
    getProviderInvoicesWithCalc(provider.id, fechaPago),
    getOwnBankAccounts(),
    getProviderReconciling(provider.nombre_normalizado),
    getProviderPaid(firstWord),
    getDataFreshness(),
  ]);

  if (!providerFull) notFound();

  const index = allProviders.findIndex((p) => p.id === provider.id) + 1;
  const healthScore = simplifiedHealthScore([
    provider.nif,
    provider.email_pago,
    provider.plazo_pago_dias,
    activeDiscountRules.length > 0 ? "yes" : null,
  ]);

  const providerDiscounts = discounts.count > 0 ? Math.round(discounts.total / discounts.count) : 0;

  const tabs = [
    { key: "basicos", label: "Datos básicos", content: <EditableBasicsForm provider={providerFull} canEdit={canEdit} /> },
    { key: "condiciones", label: "Condiciones comerciales", content: <EditableConditionsForm provider={providerFull} canEdit={canEdit} /> },
    { key: "contactos", label: "Contactos y correos", content: <EditableContactsForm provider={providerFull} canEdit={canEdit} /> },
    {
      key: "cuentas",
      label: "Cuentas bancarias",
      content: (
        <BankAccountsTab
          providerId={provider.id}
          accounts={bankAccounts}
          bankCatalog={bankCatalog}
          nitDefault={providerFull.nif}
          nombreDefault={providerFull.nombre}
          canEdit={canEdit}
        />
      ),
    },
    {
      key: "descuentos",
      label: "Descuentos por pronto pago",
      content: (
        <DiscountRulesTab
          providerId={provider.id}
          activeRules={activeDiscountRules}
          inactiveRules={inactiveDiscountRules}
          canEdit={canEdit}
        />
      ),
    },
    {
      key: "retenciones",
      label: "Retenciones",
      content: (
        <RetentionRulesTab
          providerId={provider.id}
          esAutoretenedor={providerFull.es_autoretenedor}
          activeRules={activeRetentionRules}
          inactiveRules={inactiveRetentionRules}
          canEdit={canEdit}
        />
      ),
    },
    { key: "historial", label: "Historial de cambios", content: <ProviderHistoryTab history={history} /> },
  ];

  return (
    <div className="flex flex-col gap-3">
      <ProviderSelector providerName={provider.nombre} index={index} total={allProviders.length} />

      <ProviderHeader
        nombre={provider.nombre}
        nif={provider.nif}
        plazoPagoDias={provider.plazo_pago_dias}
        discountRules={activeDiscountRules}
        emailPago={provider.email_pago}
        healthScore={healthScore}
        facturacion12m={invoiceSummary.facturacion12m}
      />

      <ProviderKPIGrid
        porPagar={{
          total: invoicesWithCalc.reduce((s, i) => s + i.valor_bruto, 0),
          count: invoicesWithCalc.length,
        }}
        porConciliar={{ count: reconciling.length, total: reconciling.reduce((s, r) => s + r.valor_total_correo, 0) }}
        capturable={providerDiscounts}
        rebateLabel="—"
      />

      <ProviderInvoiceWorkspace
        providerId={provider.id}
        providerNombre={provider.nombre}
        nombreNormalizado={provider.nombre_normalizado}
        nifDefault={provider.nif}
        initialInvoices={invoicesWithCalc}
        ownAccounts={ownAccounts}
        destAccounts={bankAccounts}
        reconciling={reconciling}
        paid={paid}
        freshness={freshness}
        canEdit={canEdit}
      />

      <SectionTabs tabs={tabs} />
    </div>
  );
}
