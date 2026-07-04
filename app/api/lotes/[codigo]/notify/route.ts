import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import { getBatchByCode } from "@/lib/batch-data";
import { getBatchProviderBreakdown, getBatchItemsDetail } from "@/lib/lotes-data";
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

  const [allBreakdown, allItems] = await Promise.all([
    getBatchProviderBreakdown(batch.id),
    getBatchItemsDetail(batch.id),
  ]);
  const breakdown = allBreakdown.filter((b) => proveedorIds.includes(b.proveedor_id));

  const results: { proveedor: string; estado: "enviado" | "error"; error?: string }[] = [];

  for (const provider of breakdown) {
    const items = allItems.filter((it) => it.proveedor_id === provider.proveedor_id);
    const facturas = items.filter((it) => it.tipo_documento === "factura");
    const ncs = items.filter((it) => it.tipo_documento === "nota_credito");

    const html = renderPaymentNotificationTemplate({
      proveedorNombre: humanizeProviderName(provider.proveedor_nombre),
      montoNeto: provider.total_neto,
      valorBruto: provider.total_bruto_facturas,
      descuento: provider.total_descuento,
      retenciones: provider.total_retenciones,
      facturas: facturas.map((f) => ({ numFactura: f.num_factura, valorNetoFormateado: formatFull(f.valor_neto) })),
      ncs: ncs.map((nc) => ({ numero: nc.num_factura, valorFormateado: formatFull(Math.abs(nc.valor_neto)) })),
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

    const subjectPrefix = modoPrueba ? "[PRUEBA] " : "";
    const subject = `${subjectPrefix}Ferreinox — Notificación de pago realizado — ${formatFull(provider.total_neto)}`;

    try {
      const [response] = await sgMail.send({
        to: destinatario,
        cc: modoPrueba ? undefined : "gerencia@ferreinox.co",
        from: { email: fromEmail, name: fromName },
        subject,
        html,
      });
      const sendgridMsgId = response.headers["x-message-id"] as string | undefined;

      await postgrestFetch(
        "/email_log",
        {
          method: "POST",
          body: JSON.stringify({
            tipo: "payment_notification",
            batch_id: batch.id,
            proveedor_id: provider.proveedor_id,
            destinatario_to: destinatario,
            destinatario_cc: modoPrueba ? null : "gerencia@ferreinox.co",
            subject,
            body_html: html,
            sendgrid_msg_id: sendgridMsgId ?? null,
            modo_prueba: modoPrueba,
            sent_by: userId,
          }),
        },
        "notifications"
      );

      results.push({ proveedor: provider.proveedor_nombre, estado: "enviado" });
    } catch (err) {
      results.push({ proveedor: provider.proveedor_nombre, estado: "error", error: err instanceof Error ? err.message : "Error desconocido" });
    }
  }

  if (!modoPrueba) {
    const logRes = await postgrestFetch(`/email_log?batch_id=eq.${batch.id}&modo_prueba=eq.false&select=proveedor_id`, {}, "notifications");
    if (logRes.ok) {
      const sentRows = (await logRes.json()) as { proveedor_id: number }[];
      const sentProviderIds = new Set(sentRows.map((r) => r.proveedor_id));
      const allNotified = allBreakdown.every((b) => sentProviderIds.has(b.proveedor_id));
      if (allNotified) {
        await postgrestFetch(
          `/payment_batch?id=eq.${batch.id}`,
          { method: "PATCH", body: JSON.stringify({ notified_at: new Date().toISOString(), notified_by: userId }) },
          "treasury"
        );
      }
    }
  }

  return NextResponse.json({ results, modoPrueba });
}
