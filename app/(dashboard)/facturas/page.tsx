import { AlertCircle, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { TablePagination } from "@/components/data-table/table-pagination";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";
import { getInvoices, getInvoiceByKey, type EmailInvoice } from "@/lib/invoices-data";
import { formatCurrency, formatDateEs } from "@/lib/format";

const TIPO_OPTIONS = [
  { value: "FACTURA", label: "Factura" },
  { value: "NOTA_CREDITO", label: "Nota crédito" },
  { value: "NOTA_DEBITO", label: "Nota débito" },
];

interface FacturasPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function FacturasPage({ searchParams }: FacturasPageProps) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const pageSize = Number(sp.pageSize ?? "50") || 50;

  let rows: EmailInvoice[] = [];
  let total = 0;
  let dataError: string | null = null;

  try {
    const result = await getInvoices({
      page,
      pageSize,
      q: sp.q,
      tipo: sp.tipo,
      fechaDesde: sp.fechaDesde,
      fechaHasta: sp.fechaHasta,
      valorMin: sp.valorMin,
      valorMax: sp.valorMax,
    });
    rows = result.rows;
    total = result.total;
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  const detail = sp.factura ? await getInvoiceByKey(sp.factura) : null;
  const closeParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key !== "factura" && value) closeParams.set(key, value);
  }
  const closeHref = `/facturas?${closeParams.toString()}`;

  const totalValue = rows.reduce((sum, r) => sum + Number(r.valor_total_correo ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Facturas ingestadas</h1>
        <p className="text-sm text-stone">Facturas y notas recibidas por correo electrónico.</p>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar las facturas. Verifica tu conexión y reintenta.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
          <TableToolbar
            searchPlaceholder="Buscar por número, remitente, asunto, message-id..."
            filterFields={[
              { name: "tipo", label: "Tipo", type: "select", options: TIPO_OPTIONS },
              { name: "fechaDesde", label: "Emisión desde", type: "date" },
              { name: "fechaHasta", label: "Emisión hasta", type: "date" },
              { name: "valorMin", label: "Valor mínimo", type: "number" },
              { name: "valorMax", label: "Valor máximo", type: "number" },
            ]}
          />

          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-parchment px-6 py-2 text-sm">
            <span className="text-stone">
              <span className="num font-semibold text-ink">{total.toLocaleString("es-CO")}</span> facturas filtradas
            </span>
            <span className="text-stone">
              Suma de la página: <span className="num font-semibold text-ink">{formatCurrency(totalValue)}</span>
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <FileText size={48} className="text-stone" />
              <p className="text-sm text-stone">
                Ninguna factura coincide con estos filtros. Ajusta la búsqueda e intenta de nuevo.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
                  <tr>
                    <th className="px-6 py-3">Proveedor</th>
                    <th className="px-4 py-3">Número</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Emisión</th>
                    <th className="px-4 py-3">Vencimiento</th>
                    <th className="px-4 py-3 text-right">Valor total</th>
                    <th className="px-4 py-3 text-right">IVA</th>
                    <th className="px-6 py-3">Recepción correo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.invoice_key}
                      className="cursor-pointer border-b border-line last:border-0 hover:bg-cream/30"
                    >
                      <td className="px-6 py-3">
                        <a
                          href={`/facturas?${new URLSearchParams({ ...sp, factura: row.invoice_key } as Record<string, string>).toString()}`}
                          className="block font-semibold text-ink hover:text-red"
                        >
                          {row.proveedor_correo ?? "—"}
                        </a>
                      </td>
                      <td className="num px-4 py-3">{row.num_factura}</td>
                      <td className="px-4 py-3">{row.tipo_documento_correo ?? "—"}</td>
                      <td className="date px-4 py-3">
                        {row.fecha_emision_correo ? formatDateEs(row.fecha_emision_correo) : "—"}
                      </td>
                      <td className="date px-4 py-3">
                        {row.fecha_vencimiento_correo ? formatDateEs(row.fecha_vencimiento_correo) : "—"}
                      </td>
                      <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_total_correo)}</td>
                      <td className="num px-4 py-3 text-right">{formatCurrency(row.valor_iva_correo)}</td>
                      <td className="date px-6 py-3">
                        {row.fecha_recepcion_correo ? formatDateEs(row.fecha_recepcion_correo) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/facturas"
            searchParams={sp}
          />
        </div>
      )}

      <Drawer open={Boolean(detail)} onCloseHref={closeHref} title={detail?.num_factura ?? "Detalle"}>
        {detail && <InvoiceDetail invoice={detail} />}
      </Drawer>
    </div>
  );
}
