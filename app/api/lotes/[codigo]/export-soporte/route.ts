import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { getBatchByCode } from "@/lib/batch-data";
import { getBatchItemsDetail, getBatchProviderBreakdown } from "@/lib/lotes-data";
import { humanizeProviderName } from "@/lib/format";

export const runtime = "nodejs";

const RED_DEEP = "FFB21917";
const INK = "FF1A1614";
const STONE = "FF8A827E";
const SUCCESS = "FF4A7A3F";
const ORANGE = "FFF0833A";
const WHITE = "FFFFFFFF";

const CURRENCY_FMT = '"$"#,##0;[Red]-"$"#,##0';

const pageSetupBase = {
  paperSize: 9,
  orientation: "landscape" as const,
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  horizontalCentered: true,
  margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
};
const headerFooter = { oddFooter: "&8&CPágina &P de &N — Generado automáticamente por el portal de Pagos Proveedores" };
const thinGray = { style: "thin" as const, color: { argb: "FFE0DAD3" } };

function isPintuco(nombre: string): boolean {
  return nombre.toUpperCase().includes("PINTUCO");
}

interface FilaSoporte {
  proveedor: string;
  num_factura: string;
  tipo_documento: "factura" | "nota_credito";
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  valor_bruto: number;
  valor_descuento: number;
  valor_retenciones: number;
  valor_neto: number;
}

function buildSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  subtitulo: string,
  filas: FilaSoporte[]
) {
  const sheet = workbook.addWorksheet(sheetName, { pageSetup: pageSetupBase, headerFooter });
  sheet.columns = [
    { key: "proveedor", width: 32 },
    { key: "factura", width: 16 },
    { key: "tipo", width: 12 },
    { key: "emision", width: 14 },
    { key: "vencimiento", width: 14 },
    { key: "bruto", width: 16 },
    { key: "descuento", width: 14 },
    { key: "retenciones", width: 14 },
    { key: "neto", width: 16 },
  ];

  const title = sheet.addRow(["FERREINOX"]);
  sheet.mergeCells(title.number, 1, title.number, 9);
  title.height = 28;
  title.getCell(1).font = { name: "Calibri", size: 18, bold: true, color: { argb: RED_DEEP } };
  title.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const subtitle = sheet.addRow([subtitulo]);
  sheet.mergeCells(subtitle.number, 1, subtitle.number, 9);
  subtitle.getCell(1).font = { name: "Calibri", size: 12, bold: true, color: { argb: INK } };
  subtitle.getCell(1).alignment = { horizontal: "center" };

  sheet.addRow([]);

  const headerRow = sheet.addRow([
    "Proveedor", "Factura", "Tipo", "Fecha emisión", "Fecha vencimiento",
    "Bruto", "Descuento", "Retenciones", "Neto",
  ]);
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  sheet.pageSetup.printTitlesRow = `${headerRow.number}:${headerRow.number}`;

  for (const f of filas) {
    const row = sheet.addRow([
      humanizeProviderName(f.proveedor),
      f.num_factura,
      f.tipo_documento === "nota_credito" ? "Nota crédito" : "Factura",
      f.fecha_emision ? new Date(f.fecha_emision) : null,
      f.fecha_vencimiento ? new Date(f.fecha_vencimiento) : null,
      f.valor_bruto,
      f.valor_descuento,
      f.valor_retenciones,
      f.valor_neto,
    ]);
    row.getCell(4).numFmt = "d-mmm-yyyy";
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).numFmt = "d-mmm-yyyy";
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).numFmt = CURRENCY_FMT;
    row.getCell(7).numFmt = CURRENCY_FMT;
    row.getCell(7).font = { color: { argb: SUCCESS } };
    row.getCell(8).numFmt = CURRENCY_FMT;
    row.getCell(8).font = { color: { argb: ORANGE } };
    row.getCell(9).numFmt = CURRENCY_FMT;
    row.getCell(9).font = { bold: true, color: { argb: INK } };
    row.eachCell((cell) => {
      cell.border = { top: thinGray, bottom: thinGray, left: thinGray, right: thinGray };
    });
  }

  sheet.addRow([]);
  const totales = filas.reduce(
    (acc, f) => ({
      bruto: acc.bruto + f.valor_bruto,
      descuento: acc.descuento + f.valor_descuento,
      retenciones: acc.retenciones + f.valor_retenciones,
      neto: acc.neto + f.valor_neto,
    }),
    { bruto: 0, descuento: 0, retenciones: 0, neto: 0 }
  );
  const totalRow = sheet.addRow([
    "TOTAL", null, null, null, null, totales.bruto, totales.descuento, totales.retenciones, totales.neto,
  ]);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, 5);
  totalRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "right", vertical: "middle" };
  });
  totalRow.getCell(6).numFmt = CURRENCY_FMT;
  totalRow.getCell(7).numFmt = CURRENCY_FMT;
  totalRow.getCell(8).numFmt = CURRENCY_FMT;
  totalRow.getCell(9).numFmt = CURRENCY_FMT;
  totalRow.getCell(9).alignment = { horizontal: "right" };
  sheet.pageSetup.printArea = `A1:I${totalRow.number}`;

  return sheet;
}

export async function GET(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const { codigo } = await params;
  const batch = await getBatchByCode(codigo);
  if (!batch) return NextResponse.json({ error: "BATCH_NOT_FOUND" }, { status: 404 });

  const [items, breakdown] = await Promise.all([
    getBatchItemsDetail(batch.id),
    getBatchProviderBreakdown(batch.id),
  ]);

  const nombreByProveedorId = new Map(breakdown.map((b) => [b.proveedor_id, b.proveedor_nombre]));

  const filas: FilaSoporte[] = items.map((it) => ({
    proveedor: nombreByProveedorId.get(it.proveedor_id) ?? batch.proveedor_nombre ?? "Proveedor",
    num_factura: it.num_factura,
    tipo_documento: it.tipo_documento,
    fecha_emision: it.fecha_emision,
    fecha_vencimiento: it.fecha_vencimiento,
    valor_bruto: it.valor_bruto,
    valor_descuento: it.valor_descuento,
    valor_retenciones: it.valor_retencion_fuente + it.valor_retencion_ica + it.valor_retencion_iva + it.valor_retencion_otros,
    valor_neto: it.valor_neto,
  }));
  filas.sort((a, b) => a.proveedor.localeCompare(b.proveedor) || (a.fecha_emision ?? "").localeCompare(b.fecha_emision ?? ""));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ferreinox — Pagos Proveedores";
  workbook.created = new Date();

  const fechaPago = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${batch.fecha_pago_programada}T00:00:00`)
  );

  buildSheet(
    workbook,
    "Resumen",
    `Lote ${batch.codigo_lote} · Pago programado ${fechaPago} · Soporte del pago`,
    filas
  );

  const pintucoFilas = filas.filter((f) => isPintuco(f.proveedor));
  if (pintucoFilas.length > 0) {
    buildSheet(workbook, "Pintuco", `Lote ${batch.codigo_lote} · Soporte específico Pintuco Colombia S.A.S`, pintucoFilas);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
  const filename = `Soporte_${batch.codigo_lote}_${stamp}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
