import { AlertCircle, CheckCircle2, HelpCircle, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConciliacionTabs } from "@/components/conciliacion/conciliacion-tabs";
import {
  getReconciled,
  getEmailWithoutErp,
  getErpWithoutEmail,
  getDiscountAlerts,
} from "@/lib/conciliacion-data";
import { formatCurrency, formatDateEs } from "@/lib/format";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const PAGE_SIZE = 100;

export default async function ConciliacionPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab = sp.tab ?? "conciliadas";

  let dataError: string | null = null;
  let counts = { conciliadas: 0, correoSinErp: 0, erpSinCorreo: 0, alertas: 0 };
  let content: React.ReactNode = null;

  try {
    const [reconciled, emailWithoutErp, erpWithoutEmail, alerts] = await Promise.all([
      getReconciled(1, tab === "conciliadas" ? PAGE_SIZE : 1),
      getEmailWithoutErp(1, tab === "correo-sin-erp" ? PAGE_SIZE : 1),
      getErpWithoutEmail(1, tab === "erp-sin-correo" ? PAGE_SIZE : 1),
      getDiscountAlerts(7),
    ]);

    counts = {
      conciliadas: reconciled.total,
      correoSinErp: emailWithoutErp.total,
      erpSinCorreo: erpWithoutEmail.total,
      alertas: alerts.length,
    };

    if (tab === "conciliadas") {
      content = (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
              <tr>
                <th className="px-6 py-3">Proveedor</th>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Estado ERP</th>
                <th className="px-4 py-3 text-right">Valor correo</th>
                <th className="px-4 py-3 text-right">Valor ERP</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
                <th className="px-6 py-3">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {reconciled.rows.map((row) => {
                const pctDiff = row.valor_total_correo ? Math.abs(row.diferencia_valor) / row.valor_total_correo : 0;
                const tone = row.diferencia_valor === 0 ? "success" : pctDiff < 0.01 ? "warning" : "danger";
                return (
                  <tr key={row.invoice_key} className="border-b border-line last:border-0 hover:bg-cream/30">
                    <td className="px-6 py-3 font-semibold text-ink">{row.nombre_display}</td>
                    <td className="num px-4 py-3">{row.num_factura_correo}</td>
                    <td className="px-4 py-3 capitalize text-stone">{row.estado_erp}</td>
                    <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_correo)}</td>
                    <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_erp)}</td>
                    <td className="num px-4 py-3 text-right">{formatCurrency(row.diferencia_valor)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${
                          tone === "success" ? "bg-success" : tone === "warning" ? "bg-yellow" : "bg-red-deep"
                        }`}
                        title={tone === "success" ? "Coincide" : tone === "warning" ? "Diferencia menor a 1%" : "Diferencia significativa"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {reconciled.rows.length === 0 && (
            <EmptyState icon={<CheckCircle2 size={48} />} text="Aún no hay facturas conciliadas para mostrar." />
          )}
        </div>
      );
    } else if (tab === "correo-sin-erp") {
      content = (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
              <tr>
                <th className="px-6 py-3">Proveedor (correo)</th>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Emisión</th>
                <th className="px-6 py-3">Recepción</th>
              </tr>
            </thead>
            <tbody>
              {emailWithoutErp.rows.map((row) => (
                <tr key={row.invoice_key} className="border-b border-line last:border-0 hover:bg-cream/30">
                  <td className="px-6 py-3 font-semibold text-ink">{row.proveedor_correo}</td>
                  <td className="num px-4 py-3">{row.num_factura}</td>
                  <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_correo)}</td>
                  <td className="date px-4 py-3">{row.fecha_emision_correo ? formatDateEs(row.fecha_emision_correo) : "—"}</td>
                  <td className="date px-6 py-3">{row.fecha_recepcion_correo ? formatDateEs(row.fecha_recepcion_correo) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {emailWithoutErp.rows.length === 0 && (
            <EmptyState icon={<Inbox size={48} />} text="Todas las facturas de correo tienen contraparte en el ERP." />
          )}
        </div>
      );
    } else if (tab === "erp-sin-correo") {
      content = (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
              <tr>
                <th className="px-6 py-3">Proveedor (ERP)</th>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-6 py-3">Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {erpWithoutEmail.rows.map((row) => (
                <tr key={row.invoice_key} className="border-b border-line last:border-0 hover:bg-cream/30">
                  <td className="px-6 py-3 font-semibold text-ink">{row.nombre_proveedor_erp}</td>
                  <td className="num px-4 py-3">{row.num_factura}</td>
                  <td className="px-4 py-3 capitalize text-stone">{row.estado_erp}</td>
                  <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_erp)}</td>
                  <td className="date px-6 py-3">{row.fecha_vencimiento_erp ? formatDateEs(row.fecha_vencimiento_erp) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {erpWithoutEmail.rows.length === 0 && (
            <EmptyState icon={<HelpCircle size={48} />} text="Todas las facturas del ERP tienen su XML recibido por correo." />
          )}
        </div>
      );
    } else if (tab === "alertas") {
      content = (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
              <tr>
                <th className="px-6 py-3">Proveedor</th>
                <th className="px-4 py-3 text-right">Tasa</th>
                <th className="px-4 py-3 text-right">Ahorro</th>
                <th className="px-4 py-3">Vence</th>
                <th className="px-6 py-3">Urgencia</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((row) => (
                <tr key={row.invoice_key} className="border-b border-line last:border-0 hover:bg-cream/30">
                  <td className="px-6 py-3 font-semibold text-ink">{row.nombre_proveedor_erp}</td>
                  <td className="num px-4 py-3 text-right">{(row.rate * 100).toFixed(1)}%</td>
                  <td className="num px-4 py-3 text-right text-success">{formatCurrency(row.valorDescuento)}</td>
                  <td className="date px-4 py-3">{formatDateEs(row.deadline)}</td>
                  <td className="px-6 py-3">
                    <span className={`text-sm font-semibold ${row.daysLeft <= 2 ? "text-red-deep" : "text-orange"}`}>
                      {row.daysLeft <= 0 ? "Vence hoy" : `${row.daysLeft} día(s)`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {alerts.length === 0 && (
            <EmptyState icon={<CheckCircle2 size={48} />} text="Ningún descuento por pronto pago vence en los próximos 7 días." />
          )}
        </div>
      );
    }
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Conciliación</h1>
        <p className="text-sm text-stone">Cruce entre correo electrónico y cartera del ERP.</p>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar la conciliación. Verifica tu conexión y reintenta.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
          <ConciliacionTabs
            active={tab}
            tabs={[
              { key: "conciliadas", label: "Conciliadas", count: counts.conciliadas },
              { key: "correo-sin-erp", label: "Correo sin ERP", count: counts.correoSinErp },
              { key: "erp-sin-correo", label: "ERP sin correo", count: counts.erpSinCorreo },
              { key: "alertas", label: "Alertas de descuento", count: counts.alertas },
            ]}
          />
          {content}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-stone">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}
