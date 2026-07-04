import { formatFull } from "@/lib/format";

export interface PaymentNotificationItem {
  numFactura: string;
  tipoDocumento: "factura" | "nota_credito";
  fechaEmision: string | null;
  valorBruto: number;
  valorDescuento: number;
  valorNeto: number;
}

export interface PaymentNotificationParams {
  proveedorNombre: string;
  proveedorNit: string | null;
  montoNeto: number;
  valorBruto: number;
  descuento: number;
  retenciones: number;
  items: PaymentNotificationItem[];
  fechaAplicacion: string;
  bancoDestino: string;
  ultimos4Digitos: string;
  codigoLote: string;
}

const NAVY = "#0d2340";
const BLUE = "#1c4e80";
const RED = "#ef3737";
const RED_DEEP = "#c0392b";
const GOLD = "#f3b221";
const GREEN = "#0fa968";
const STONE = "#6b7c8f";
const INK = "#0c2d57";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function renderPaymentNotificationTemplate(p: PaymentNotificationParams): string {
  const facturas = p.items.filter((i) => i.tipoDocumento === "factura");
  const ncs = p.items.filter((i) => i.tipoDocumento === "nota_credito");

  const filaFactura = (f: PaymentNotificationItem, i: number) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${INK};font-weight:700;border-bottom:1px solid #edf1f5;">${f.numFactura}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${STONE};border-bottom:1px solid #edf1f5;">${fmtDate(f.fechaEmision)}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${INK};text-align:right;border-bottom:1px solid #edf1f5;">${formatFull(f.valorBruto)}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${f.valorDescuento > 0 ? GREEN : STONE};text-align:right;border-bottom:1px solid #edf1f5;">${f.valorDescuento > 0 ? `−${formatFull(f.valorDescuento)}` : "—"}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${INK};font-weight:700;text-align:right;border-bottom:1px solid #edf1f5;">${formatFull(f.valorNeto)}</td>
    </tr>`;

  const filaNc = (nc: PaymentNotificationItem, i: number) => `
    <tr style="background:${i % 2 === 0 ? "#fdf1f0" : "#fdf7f6"};">
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${RED_DEEP};font-weight:700;border-bottom:1px solid #f6e2e0;">NC ${nc.numFactura}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${RED_DEEP};border-bottom:1px solid #f6e2e0;">${fmtDate(nc.fechaEmision)}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${RED_DEEP};text-align:right;border-bottom:1px solid #f6e2e0;" colspan="2">Nota crédito aplicada</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${RED_DEEP};font-weight:700;text-align:right;border-bottom:1px solid #f6e2e0;">−${formatFull(Math.abs(nc.valorNeto))}</td>
    </tr>`;

  const filasHtml = facturas.map(filaFactura).join("") + ncs.map(filaNc).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#eef2f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(13,35,64,0.12);">

          <!-- Hero header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 55%, ${RED} 130%);background-color:${NAVY};padding:36px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">FERREINOX</span>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:2px;margin-top:2px;">S.A.S. BIC</div>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.28);border-radius:999px;padding:6px 14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">✓ PAGO REALIZADO</span>
                  </td>
                </tr>
              </table>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#f4f7fa;margin-top:22px;opacity:0.92;">Notificación oficial de pago a proveedor</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 8px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${INK};margin:0 0 14px;line-height:1.6;">
                Estimados <strong>${p.proveedorNombre}</strong>,
              </p>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${INK};margin:0 0 22px;line-height:1.6;">
                Les confirmamos que Ferreinox realizó el pago de las siguientes facturas, aplicado el <strong>${p.fechaAplicacion}</strong>.
              </p>
            </td>
          </tr>

          <!-- Info grid -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fb;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;width:50%;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:9.5px;font-weight:700;color:${STONE};text-transform:uppercase;letter-spacing:0.6px;">Proveedor</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:${INK};margin-top:2px;">${p.proveedorNombre}</div>
                    ${p.proveedorNit ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:${STONE};margin-top:1px;">NIT ${p.proveedorNit}</div>` : ""}
                  </td>
                  <td style="padding:16px 20px;width:50%;border-left:1px solid #e3e9ef;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:9.5px;font-weight:700;color:${STONE};text-transform:uppercase;letter-spacing:0.6px;">Pago realizado desde</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:${INK};margin-top:2px;">${p.bancoDestino}</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:${STONE};margin-top:1px;">Cuenta ****${p.ultimos4Digitos}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invoice table -->
          <tr>
            <td style="padding:0 40px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11.5px;font-weight:800;color:${INK};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Detalle de facturas pagadas (${facturas.length}${ncs.length > 0 ? ` + ${ncs.length} NC` : ""})</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e9ef;border-radius:10px;overflow:hidden;">
                <thead>
                  <tr style="background:${NAVY};">
                    <th style="padding:11px 14px;text-align:left;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Documento</th>
                    <th style="padding:11px 14px;text-align:left;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Emisión</th>
                    <th style="padding:11px 14px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Bruto</th>
                    <th style="padding:11px 14px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Descuento</th>
                    <th style="padding:11px 14px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  ${filasHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:22px 40px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8ea;border:1px solid ${GOLD};border-radius:10px;">
                <tr>
                  <td style="padding:14px 20px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${STONE};">Valor bruto</td>
                  <td style="padding:14px 20px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${INK};text-align:right;font-weight:600;">${formatFull(p.valorBruto)}</td>
                </tr>
                ${p.descuento > 0 ? `<tr>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GREEN};">Descuento pronto pago</td>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GREEN};text-align:right;font-weight:600;">−${formatFull(p.descuento)}</td>
                </tr>` : ""}
                ${p.retenciones > 0 ? `<tr>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GOLD};">Retenciones aplicadas</td>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GOLD};text-align:right;font-weight:600;">−${formatFull(p.retenciones)}</td>
                </tr>` : ""}
                <tr>
                  <td colspan="2" style="padding:10px 20px;"><div style="border-top:1px solid #ecdca0;"></div></td>
                </tr>
                <tr>
                  <td style="padding:2px 20px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;color:${RED_DEEP};">Total pagado</td>
                  <td style="padding:2px 20px 16px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;color:${RED_DEEP};text-align:right;">${formatFull(p.montoNeto)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 32px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${STONE};margin:0;line-height:1.6;">
                Si encuentran alguna diferencia frente a lo facturado, por favor contáctenos respondiendo este correo. Agradecemos su confianza en Ferreinox.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${NAVY};padding:22px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#ffffff;">Ferreinox S.A.S. BIC</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#aab8c8;margin-top:2px;">NIT 800.224.617-1 · Pereira, Risaralda, Colombia</div>
                  </td>
                  <td align="right">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#aab8c8;">Referencia interna: ${p.codigoLote}</div>
                  </td>
                </tr>
              </table>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:9.5px;color:#7c8aa0;margin-top:14px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
                Este es un correo automático generado por el sistema de tesorería de Ferreinox. Por favor no lo reenvíe con información sensible sin verificar el destinatario.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
