import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProviderSelector } from "@/components/providers/provider-selector";
import { ProviderHeader } from "@/components/providers/provider-header";
import { ProviderKPIGrid } from "@/components/providers/provider-kpi-grid";
import {
  getProviderById,
  listProviders,
  getDiscountRules,
  discountSummaryText,
  getProviderInvoiceSummary,
} from "@/lib/provider-detail-data";
import { getCapturableDiscountTotal } from "@/lib/dashboard-data";

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

  const [allProviders, discountRules, invoiceSummary, discounts] = await Promise.all([
    listProviders(),
    getDiscountRules(provider.id),
    getProviderInvoiceSummary(provider.nombre_normalizado, provider.nombre.split(" ")[0]),
    getCapturableDiscountTotal(),
  ]);

  const index = allProviders.findIndex((p) => p.id === provider.id) + 1;
  const healthScore = simplifiedHealthScore([
    provider.nif,
    provider.email_pago,
    provider.plazo_pago_dias,
    discountRules.length > 0 ? "yes" : null,
  ]);

  const providerDiscounts = discounts.count > 0 ? Math.round(discounts.total / discounts.count) : 0;

  return (
    <div className="flex flex-col">
      <ProviderSelector providerName={provider.nombre} index={index} total={allProviders.length} />

      <ProviderHeader
        nombre={provider.nombre}
        nif={provider.nif}
        plazoPagoDias={provider.plazo_pago_dias}
        discountSummary={discountSummaryText(discountRules)}
        emailPago={provider.email_pago}
        healthScore={healthScore}
        facturacion12m={invoiceSummary.facturacion12m}
      />

      <ProviderKPIGrid
        porPagar={{ total: invoiceSummary.porPagarTotal, count: invoiceSummary.porPagarCount }}
        porConciliar={{ count: 0, total: 0 }}
        capturable={providerDiscounts}
        rebateLabel="—"
      />

      <Card>
        <p className="text-sm text-stone">
          La tabla de facturas con tabs (por pagar / por conciliar / ya pagadas), el panel de acción
          sugerida y el footer de armado de lote llegan en el Checkpoint DR.3.
        </p>
      </Card>
    </div>
  );
}
