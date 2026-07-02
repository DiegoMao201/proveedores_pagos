import type { EmailInvoice } from "@/lib/invoices-data";
import { formatCurrency, formatDateEs } from "@/lib/format";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="border-b border-line py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone">{label}</p>
      <p className="num mt-1 text-sm text-ink">{value ?? "—"}</p>
    </div>
  );
}

export function InvoiceDetail({ invoice }: { invoice: EmailInvoice }) {
  return (
    <div>
      <Field label="Proveedor" value={invoice.proveedor_correo} />
      <Field label="Número de factura" value={invoice.num_factura} />
      <Field label="Tipo de documento" value={invoice.tipo_documento_correo} />
      <Field label="Documento relacionado" value={invoice.documento_relacionado_correo} />
      <Field label="Descripción nota" value={invoice.descripcion_nota_correo} />
      <Field label="Fecha de emisión" value={invoice.fecha_emision_correo ? formatDateEs(invoice.fecha_emision_correo) : null} />
      <Field label="Fecha de vencimiento" value={invoice.fecha_vencimiento_correo ? formatDateEs(invoice.fecha_vencimiento_correo) : null} />
      <Field label="Valor total" value={formatCurrency(invoice.valor_total_correo)} />
      <Field label="Valor base" value={formatCurrency(invoice.valor_base_correo)} />
      <Field label="IVA" value={formatCurrency(invoice.valor_iva_correo)} />
      <Field label="Fecha de recepción del correo" value={invoice.fecha_recepcion_correo ? formatDateEs(invoice.fecha_recepcion_correo) : null} />
      <Field label="Remitente" value={invoice.remitente_correo} />
      <Field label="Asunto" value={invoice.asunto_correo} />
      <Field label="Nombre del adjunto" value={invoice.nombre_adjunto} />
      <Field label="Message-ID" value={invoice.message_id} />
      <Field label="Origen del soporte" value={invoice.origen_soporte} />
      <Field label="Invoice key (clave de conciliación)" value={invoice.invoice_key} />
    </div>
  );
}
