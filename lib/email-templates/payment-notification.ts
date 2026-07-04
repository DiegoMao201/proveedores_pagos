import { formatFull } from "@/lib/format";

export interface PaymentNotificationItem {
  numFactura: string;
  valorNetoFormateado: string;
}

export interface PaymentNotificationParams {
  proveedorNombre: string;
  montoNeto: number;
  valorBruto: number;
  descuento: number;
  retenciones: number;
  facturas: PaymentNotificationItem[];
  ncs: { numero: string; valorFormateado: string }[];
  fechaAplicacion: string;
  bancoDestino: string;
  ultimos4Digitos: string;
  codigoLote: string;
}

export function renderPaymentNotificationTemplate(p: PaymentNotificationParams): string {
  const filasFacturas = p.facturas
    .map(
      (f) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;">${f.numFactura}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;text-align:right;">${f.valorNetoFormateado}</td>
      </tr>`
    )
    .join("");

  const seccionNcs =
    p.ncs.length > 0
      ? `<tr><td colspan="2" style="padding:12px 12px 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#ef3737;">Notas crédito aplicadas</td></tr>` +
        p.ncs
          .map(
            (nc) => `<tr>
              <td style="padding:6px 12px;font-family:Arial,sans-serif;font-size:13px;color:#ef3737;">NC ${nc.numero}</td>
              <td style="padding:6px 12px;font-family:Arial,sans-serif;font-size:13px;color:#ef3737;text-align:right;">−${nc.valorFormateado}</td>
            </tr>`
          )
          .join("")
      : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0d2340;padding:24px 32px;">
              <span style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;">Ferreinox</span>
              <div style="font-family:Arial,sans-serif;font-size:11px;color:#f3b221;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Notificación de pago</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;margin:0 0 16px;">
                Estimados <strong>${p.proveedorNombre}</strong>,
              </p>
              <p style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;margin:0 0 16px;">
                Les informamos que hemos realizado el pago de las facturas relacionadas a continuación, aplicado el ${p.fechaAplicacion}.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4e9;border-radius:8px;margin-bottom:16px;">
                <tr><td colspan="2" style="padding:10px 12px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#506070;text-transform:uppercase;">Detalle de facturas</td></tr>
                ${filasFacturas}
                ${seccionNcs}
                <tr>
                  <td style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;color:#506070;">Bruto</td>
                  <td style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;color:#506070;text-align:right;">${formatFull(p.valorBruto)}</td>
                </tr>
                ${p.descuento > 0 ? `<tr><td style="padding:2px 12px;font-family:Arial,sans-serif;font-size:12px;color:#0fa968;">Descuento pronto pago</td><td style="padding:2px 12px;font-family:Arial,sans-serif;font-size:12px;color:#0fa968;text-align:right;">−${formatFull(p.descuento)}</td></tr>` : ""}
                ${p.retenciones > 0 ? `<tr><td style="padding:2px 12px;font-family:Arial,sans-serif;font-size:12px;color:#f3b221;">Retenciones</td><td style="padding:2px 12px;font-family:Arial,sans-serif;font-size:12px;color:#f3b221;text-align:right;">−${formatFull(p.retenciones)}</td></tr>` : ""}
                <tr>
                  <td style="padding:12px;font-family:Arial,sans-serif;font-size:14px;font-weight:800;color:#ef3737;">Total pagado</td>
                  <td style="padding:12px;font-family:Arial,sans-serif;font-size:16px;font-weight:800;color:#ef3737;text-align:right;">${formatFull(p.montoNeto)}</td>
                </tr>
              </table>

              <p style="font-family:Arial,sans-serif;font-size:12px;color:#506070;margin:0 0 4px;">
                Pago realizado desde ${p.bancoDestino} · Cuenta ****${p.ultimos4Digitos}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f4f6f8;padding:16px 32px;">
              <p style="font-family:Arial,sans-serif;font-size:10px;color:#9aa5b1;margin:0;">
                Ferreinox S.A.S. BIC · Referencia interna: ${p.codigoLote}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
