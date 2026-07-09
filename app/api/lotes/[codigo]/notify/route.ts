import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import { getBatchByCode } from "@/lib/batch-data";
import { getBatchProviderBreakdown, getBatchItemsDetail } from "@/lib/lotes-data";
import { getProviderContactsForProviders } from "@/lib/provider-contact-data";
import { renderPaymentNotificationTemplate } from "@/lib/email-templates/payment-notification";
import { formatFull, formatDateEs, humanizeProviderName } from "@/lib/format";

export const runtime = "nodejs";

interface NotifyBody {
  proveedorIds: number[];
  modoPrueba: boolean;
}

export async function POST(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const { codigo } = await params;
  const batch = await getBatchByCode(codigo);
  if (!batch) return NextResponse.json({ error: "BATCH_NOT_FOUND" }, { status: 404 });
  if (batch.estado !== "paid") return NextResponse.json({ error: "BATCH_NOT_PAID" }, { status: 400 });

  const { proveedorIds, modoPrueba } = (await req.json()) as NotifyBody;
  if (!proveedorIds?.length) return NextResponse.json({ error: "EMPTY_PROVIDER_LIST" }, { status: 400 });

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "SENDGRID_NOT_CONFIGURED" }, { status: 500 });
  sgMail.setApiKey(apiKey);

  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? "tesoreria@ferreinox.co";
  const fromName = process.env.SENDGRID_FROM_NAME ?? "Ferreinox — Tesorería";
  const testEmail = "compras@ferreinox.co";

  const [allBreakdown, allItems, contacts] = await Promise.all([
    getBatchProviderBreakdown(batch.id),
    getBatchItemsDetail(batch.id),
    getProviderContactsForProviders(proveedorIds),
  ]);
  const breakdown = allBreakdown.filter((b) => proveedorIds.includes(b.proveedor_id));

  const results: { proveedor: string; estado: "enviado" | "error"; error?: string }[] = [];

  for (const provider of breakdown) {
    const items = allItems.filter((it) => it.proveedor_id === provider.proveedor_id);

    const html = renderPaymentNotificationTemplate({
      proveedorNombre: humanizeProviderName(provider.proveedor_nombre),
      proveedorNit: provider.proveedor_nit,
      montoNeto: provider.total_neto,
      valorBruto: provider.total_bruto_facturas,
      descuento: provider.total_descuento,
      retenciones: provider.total_retenciones,
      items: items.map((it) => ({
        numFactura: it.num_factura,
        tipoDocumento: it.tipo_documento,
        fechaEmision: it.fecha_emision,
        valorBruto: it.valor_bruto,
        valorDescuento: it.valor_descuento,
        valorNeto: it.valor_neto,
      })),
      fechaAplicacion: formatDateEs(batch.fecha_pago_programada),
      bancoDestino: "Bancolombia",
      ultimos4Digitos: provider.cuenta_destino?.slice(-4) ?? "----",
      codigoLote: batch.codigo_lote,
    });

    const destinatario = modoPrueba ? testEmail : provider.email_pago;
    if (!destinatario) {
      results.push({ proveedor: provider.proveedor_nombre, estado: "error", error: "Sin email de pago configurado" });
      continue;
    }

    const contactosExtra = contacts.filter((c) => c.provider_id === provider.proveedor_id).map((c) => c.email);
    const ccList = modoPrueba ? undefined : ["gerencia@ferreinox.co", ...contactosExtra];

    const subjectPrefix = modoPrueba ? "[PRUEBA] " : "";
    const subject = `${subjectPrefix}Ferreinox — Notificación de pago realizado — ${formatFull(provider.total_neto)}`;

    try {
      const [response] = await sgMail.send({
        to: destinatario,
        cc: ccList,
        from: { email: fromEmail, name: fromName },
        subject,
        html,
      });
      const sendgridMsgId = response.headers["x-message-id"] as string | undefined;

      await postgrestFetch(
        "/rpc/log_payment_notification",
        {
          method: "POST",
          body: JSON.stringify({
            p_batch_id: batch.id,
            p_proveedor_id: provider.proveedor_id,
            p_destinatario_to: destinatario,
            p_destinatario_cc: ccList?.join(", ") ?? null,
            p_subject: subject,
            p_body_html: html,
            p_sendgrid_msg_id: sendgridMsgId ?? null,
            p_modo_prueba: modoPrueba,
            p_user_id: userId,
          }),
        },
        "treasury"
      );

      results.push({ proveedor: provider.proveedor_nombre, estado: "enviado" });
    } catch (err) {
      results.push({ proveedor: provider.proveedor_nombre, estado: "error", error: err instanceof Error ? err.message : "Error desconocido" });
    }
  }

  if (!modoPrueba) {
    await postgrestFetch(
      "/rpc/check_and_mark_batch_notified",
      { method: "POST", body: JSON.stringify({ p_batch_id: batch.id, p_user_id: userId }) },
      "treasury"
    );
  }

  return NextResponse.json({ results, modoPrueba });
}
