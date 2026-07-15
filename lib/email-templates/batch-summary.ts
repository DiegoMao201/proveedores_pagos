import { formatFull } from "@/lib/format";
import { humanizeProviderName } from "@/lib/format";

export interface BatchSummaryProviderRow {
  proveedorNombre: string;
  numDocumentos: number;
  valorBruto: number;
  descuento: number;
  retenciones: number;
  valorNeto: number;
}

export interface BatchSummaryParams {
  codigoLote: string;
  fechaAplicacion: string;
  bancoDestino: string;
  proveedores: BatchSummaryProviderRow[];
  totalBruto: number;
  totalDescuento: number;
  totalRetenciones: number;
  totalNeto: number;
  totalAbonosAplicados?: number;
}

const NAVY = "#0d2340";
const BLUE = "#1c4e80";
const RED = "#ef3737";
const RED_DEEP = "#c0392b";
const GOLD = "#f3b221";
const GREEN = "#0fa968";
const STONE = "#6b7c8f";
const INK = "#0c2d57";

export function renderBatchSummaryTemplate(p: BatchSummaryParams): string {
  const filas = p.proveedores
    .map(
      (row, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${INK};font-weight:700;border-bottom:1px solid #edf1f5;">${humanizeProviderName(row.proveedorNombre)}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${STONE};text-align:center;border-bottom:1px solid #edf1f5;">${row.numDocumentos}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${INK};text-align:right;border-bottom:1px solid #edf1f5;">${formatFull(row.valorBruto)}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${row.descuento > 0 ? GREEN : STONE};text-align:right;border-bottom:1px solid #edf1f5;">${row.descuento > 0 ? `−${formatFull(row.descuento)}` : "—"}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${row.retenciones > 0 ? GOLD : STONE};text-align:right;border-bottom:1px solid #edf1f5;">${row.retenciones > 0 ? `−${formatFull(row.retenciones)}` : "—"}</td>
      <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${INK};font-weight:700;text-align:right;border-bottom:1px solid #edf1f5;">${formatFull(row.valorNeto)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#eef2f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="700" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(13,35,64,0.12);">

          <tr>
            <td style="background:linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 55%, ${RED} 130%);background-color:${NAVY};padding:36px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">FERREINOX</span>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:2px;margin-top:2px;">S.A.S. BIC</div>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.28);border-radius:999px;padding:6px 14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">✓ LOTE PAGADO</span>
                  </td>
                </tr>
              </table>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#f4f7fa;margin-top:22px;opacity:0.92;">Resumen consolidado de lote de pago — ${p.proveedores.length} proveedores</div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 8px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${INK};margin:0 0 22px;line-height:1.6;">
                Se realizó el pago del lote <strong>${p.codigoLote}</strong> el <strong>${p.fechaAplicacion}</strong> desde <strong>${p.bancoDestino}</strong>, a los siguientes ${p.proveedores.length} proveedores.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e9ef;border-radius:10px;overflow:hidden;">
                <thead>
                  <tr style="background:${NAVY};">
                    <th style="padding:11px 14px;text-align:left;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Proveedor</th>
                    <th style="padding:11px 14px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Docs</th>
                    <th style="padding:11px 14px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Bruto</th>
                    <th style="padding:11px 14px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Descuento</th>
                    <th style="padding:11px 14px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Retención</th>
                    <th style="padding:11px 14px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.4px;">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  ${filas}
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 40px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8ea;border:1px solid ${GOLD};border-radius:10px;">
                <tr>
                  <td style="padding:14px 20px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${STONE};">Valor bruto total</td>
                  <td style="padding:14px 20px 4px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${INK};text-align:right;font-weight:600;">${formatFull(p.totalBruto)}</td>
                </tr>
                ${p.totalDescuento > 0 ? `<tr>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GREEN};">Descuento pronto pago capturado</td>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GREEN};text-align:right;font-weight:600;">−${formatFull(p.totalDescuento)}</td>
                </tr>` : ""}
                ${p.totalRetenciones > 0 ? `<tr>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GOLD};">Retenciones aplicadas</td>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GOLD};text-align:right;font-weight:600;">−${formatFull(p.totalRetenciones)}</td>
                </tr>` : ""}
                ${p.totalAbonosAplicados && p.totalAbonosAplicados > 0 ? `<tr>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GREEN};">Abonos ya consignados por sede</td>
                  <td style="padding:2px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${GREEN};text-align:right;font-weight:600;">−${formatFull(p.totalAbonosAplicados)}</td>
                </tr>` : ""}
                <tr>
                  <td colspan="2" style="padding:10px 20px;"><div style="border-top:1px solid #ecdca0;"></div></td>
                </tr>
                <tr>
                  <td style="padding:2px 20px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;color:${RED_DEEP};">Total transferido por banco</td>
                  <td style="padding:2px 20px 16px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;color:${RED_DEEP};text-align:right;">${formatFull(p.totalNeto)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:${NAVY};padding:22px 40px;margin-top:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#ffffff;">Ferreinox S.A.S. BIC</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#aab8c8;margin-top:2px;">NIT 800.224.617-8 · Pereira, Risaralda, Colombia</div>
                  </td>
                  <td align="right">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#aab8c8;">Referencia interna: ${p.codigoLote}</div>
                  </td>
                </tr>
              </table>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:9.5px;color:#7c8aa0;margin-top:14px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
                Resumen consolidado — se notificó individualmente a cada proveedor por separado.
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
