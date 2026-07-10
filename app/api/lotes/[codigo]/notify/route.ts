import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import { getBatchByCode } from "@/lib/batch-data";
import { getBatchProviderBreakdown, getBatchItemsDetail } from "@/lib/lotes-data";
import { getProviderContactsForProviders } from "@/lib/provider-contact-data";
import { renderPaymentNotificationTemplate } from "@/lib/email-templates/payment-notification";
import { renderBatchSummaryTemplate } from "@/lib/email-templates/batch-summary";
import { formatFull, formatDateEs, humanizeProviderName } from "@/lib/format";

export const runtime = "nodejs";

interface NotifyBody {
  proveedorIds: number[];
  modoPrueba: boolean;
  emailOverrides?: Record<number, string>;
}

export async function POST(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const { codigo } = await params;
  const batch = await getBatchByCode(codigo);
  if (!batch) return NextResponse.json({ error: "BATCH_NOT_FOUND" }, { status: 404 });
  if (batch.estado !== "paid") return NextResponse.json({ error: "BATCH_NOT_PAID" }, { status: 400 });

  const { proveedorIds, modoPrueba, emailOverrides } = (await req.json()) as NotifyBody;
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

    const contactosExtra = contacts.filter((c) => c.provider_id === provider.proveedor_id).map((c) => c.email);
    const override = emailOverrides?.[provider.proveedor_id]?.trim();
    const destinatarioReal = override || provider.email_pago || contactosExtra[0];
    const destinatario = modoPrueba ? testEmail : destinatarioReal;
    if (!destinatario) {
      results.push({ proveedor: provider.proveedor_nombre, estado: "error", error: "Sin email de pago configurado" });
      continue;
    }

    // Si el destinatario ya salió de contactosExtra (porque no había email de
    // pago), no lo dupliques en copia.
    const ccBase = destinatarioReal === contactosExtra[0] ? contactosExtra.slice(1) : contactosExtra;
    const ccList = modoPrueba ? undefined : ccBase.length > 0 ? ccBase : undefined;

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

      // Si escribió un correo nuevo aquí mismo y no había uno guardado,
      // lo dejamos puesto en la cuenta bancaria para que el próximo lote
      // ya lo traiga sin tener que volver a escribirlo.
      if (!modoPrueba && override && override !== provider.email_pago && provider.bank_account_id) {
        await postgrestFetch(
          `/bank_account?id=eq.${provider.bank_account_id}`,
          { method: "PATCH", body: JSON.stringify({ email_pago: override, updated_by: userId }) },
          "providers"
        );
      }
    } catch (err) {
      results.push({ proveedor: provider.proveedor_nombre, estado: "error", error: err instanceof Error ? err.message : "Error desconocido" });
    }
  }

  // Gerencia ya no recibe copia de cada notificación individual -- en vez de
  // eso recibe un único correo con el resumen consolidado de TODO el lote
  // (allBreakdown, no solo los proveedores seleccionados para notificar hoy)
  // para que el total coincida con lo que realmente salió del banco.
  const gerenciaHtml = renderBatchSummaryTemplate({
    codigoLote: batch.codigo_lote,
    fechaAplicacion: formatDateEs(batch.fecha_pago_programada),
    bancoDestino: "Bancolombia",
    proveedores: allBreakdown.map((b) => ({
      proveedorNombre: b.proveedor_nombre,
      numDocumentos: b.num_documentos,
      valorBruto: b.total_bruto_facturas,
      descuento: b.total_descuento,
      retenciones: b.total_retenciones,
      valorNeto: b.total_neto,
    })),
    totalBruto: allBreakdown.reduce((s, b) => s + b.total_bruto_facturas, 0),
    totalDescuento: allBreakdown.reduce((s, b) => s + b.total_descuento, 0),
    totalRetenciones: allBreakdown.reduce((s, b) => s + b.total_retenciones, 0),
    totalNeto: allBreakdown.reduce((s, b) => s + b.total_neto, 0),
  });
  const gerenciaSubjectPrefix = modoPrueba ? "[PRUEBA] " : "";
  const gerenciaSubject = `${gerenciaSubjectPrefix}Ferreinox — Lote ${batch.codigo_lote} pagado — ${formatFull(allBreakdown.reduce((s, b) => s + b.total_neto, 0))}`;
  const gerenciaDestinatario = modoPrueba ? testEmail : "gerencia@ferreinox.co";

  try {
    const [gerenciaResponse] = await sgMail.send({
      to: gerenciaDestinatario,
      from: { email: fromEmail, name: fromName },
      subject: gerenciaSubject,
      html: gerenciaHtml,
    });
    const gerenciaMsgId = gerenciaResponse.headers["x-message-id"] as string | undefined;
    await postgrestFetch(
      "/rpc/log_payment_notification",
      {
        method: "POST",
        body: JSON.stringify({
          p_batch_id: batch.id,
          p_proveedor_id: null,
          p_destinatario_to: gerenciaDestinatario,
          p_destinatario_cc: null,
          p_subject: gerenciaSubject,
          p_body_html: gerenciaHtml,
          p_sendgrid_msg_id: gerenciaMsgId ?? null,
          p_modo_prueba: modoPrueba,
          p_user_id: userId,
        }),
      },
      "treasury"
    );
    results.push({ proveedor: "Gerencia (resumen consolidado)", estado: "enviado" });
  } catch (err) {
    results.push({ proveedor: "Gerencia (resumen consolidado)", estado: "error", error: err instanceof Error ? err.message : "Error desconocido" });
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
