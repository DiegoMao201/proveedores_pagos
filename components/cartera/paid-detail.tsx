import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ErpPaid } from "@/lib/cartera-data";
import { getEmailMatchForInvoiceKey } from "@/lib/cartera-data";
import { formatCurrency, formatDateEs, humanizeProviderName } from "@/lib/format";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="border-b border-line py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone">{label}</p>
      <p className="num mt-1 text-sm text-ink">{value ?? "—"}</p>
    </div>
  );
}

export async function PaidDetail({ row }: { row: ErpPaid }) {
  const emailMatch = await getEmailMatchForInvoiceKey(row.invoice_key);

  return (
    <div>
      <Field label="Proveedor (ERP)" value={humanizeProviderName(row.nombre_proveedor_erp)} />
      <Field label="Serie" value={row.serie} />
      <Field label="Número de entrada" value={row.num_entrada} />
      <Field label="Número de factura" value={row.num_factura} />
      <Field label="Estado del documento" value={row.estado_documento} />
      <Field label="Fecha de emisión" value={row.fecha_emision_erp ? formatDateEs(row.fecha_emision_erp) : null} />
      <Field label="Fecha de vencimiento" value={row.fecha_vencimiento_erp ? formatDateEs(row.fecha_vencimiento_erp) : null} />
      <Field label="Valor total" value={formatCurrency(row.valor_total_erp)} />
      <Field label="Última sincronización" value={formatDateEs(row.synced_at)} />

      <div className="mt-4 rounded-md border border-line bg-parchment p-4">
        {emailMatch ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 size={16} />
            Con factura recibida por correo
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            Sin factura en correo asociada.
          </p>
        )}
      </div>
    </div>
  );
}
