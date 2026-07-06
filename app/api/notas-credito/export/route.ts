import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { getNotasCreditoEstrategicas } from "@/lib/notas-credito-data";
import { humanizeProviderName } from "@/lib/format";

export const runtime = "nodejs";

const RED_DEEP = "FFB21917";
const CREAM = "FFFEF4C0";
const CREAM_SOFT = "FFFDFAEB";
const INK = "FF1A1614";
const STONE = "FF8A827E";
const SUCCESS = "FF4A7A3F";
const ORANGE = "FFF0833A";
const WHITE = "FFFFFFFF";

const CURRENCY_FMT = '"$"#,##0;[Red]-"$"#,##0';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const rows = await getNotasCreditoEstrategicas();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ferreinox — Pagos Proveedores";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Notas crédito", {
    pageSetup: {
      paperSize: 9, // carta
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
    headerFooter: {
      oddFooter: "&8&CPágina &P de &N — Generado automáticamente por el portal de Pagos Proveedores",
    },
  });

  sheet.columns = [
    { key: "nota", width: 22 },
    { key: "fecha", width: 16 },
    { key: "estado", width: 30 },
    { key: "valor", width: 20 },
  ];

  const total = rows.reduce((s, r) => s + r.valor_bruto, 0);
  const generado = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  // --- Encabezado ---
  const titleRow = sheet.addRow(["FERREINOX"]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 4);
  titleRow.height = 30;
  titleRow.getCell(1).font = { name: "Calibri", size: 20, bold: true, color: { argb: RED_DEEP } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const subtitleRow = sheet.addRow(["Notas crédito pendientes — Proveedores estratégicos"]);
  sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, 4);
  subtitleRow.getCell(1).font = { name: "Calibri", size: 12, bold: true, color: { argb: INK } };
  subtitleRow.getCell(1).alignment = { horizontal: "center" };

  const summaryRow = sheet.addRow([
    `${rows.length} notas crédito · $${Math.abs(total).toLocaleString("es-CO")} en total`,
  ]);
  sheet.mergeCells(summaryRow.number, 1, summaryRow.number, 4);
  summaryRow.getCell(1).font = { name: "Calibri", size: 10, italic: true, color: { argb: STONE } };
  summaryRow.getCell(1).alignment = { horizontal: "center" };

  const generadoRow = sheet.addRow([`Generado el ${generado}`]);
  sheet.mergeCells(generadoRow.number, 1, generadoRow.number, 4);
  generadoRow.getCell(1).font = { name: "Calibri", size: 9, italic: true, color: { argb: STONE } };
  generadoRow.getCell(1).alignment = { horizontal: "center" };

  sheet.addRow([]);

  const headerRow = sheet.addRow(["N° Nota crédito", "Fecha emisión", "Estado", "Valor"]);
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: RED_DEEP } },
      bottom: { style: "thin", color: { argb: RED_DEEP } },
      left: { style: "thin", color: { argb: RED_DEEP } },
      right: { style: "thin", color: { argb: RED_DEEP } },
    };
  });
  headerRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  sheet.pageSetup.printTitlesRow = `${headerRow.number}:${headerRow.number}`;

  const thinGray = { style: "thin" as const, color: { argb: "FFE0DAD3" } };

  function addGroupHeader(nombre: string, count: number) {
    const r = sheet.addRow([`${humanizeProviderName(nombre)} (${count} ${count === 1 ? "nota" : "notas"})`]);
    sheet.mergeCells(r.number, 1, r.number, 4);
    r.getCell(1).font = { name: "Calibri", size: 10.5, bold: true, color: { argb: INK } };
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
    r.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    r.getCell(1).border = { bottom: { style: "thin", color: { argb: RED_DEEP } } };
    return r;
  }

  function addDataRow(r: (typeof rows)[number]) {
    const disponible = r.es_seleccionable;
    const estadoLabel = disponible ? "Disponible para aplicar" : r.motivo_no_seleccionable ?? "Esperando nota del proveedor";
    const row = sheet.addRow([
      `NC ${r.num_factura}`,
      r.fecha_emision ? new Date(r.fecha_emision) : null,
      estadoLabel,
      r.valor_bruto,
    ]);
    row.getCell(1).font = { name: "Calibri", size: 10, color: { argb: INK } };
    row.getCell(2).font = { name: "Calibri", size: 10, color: { argb: INK } };
    row.getCell(2).numFmt = "d-mmm-yyyy";
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).font = { name: "Calibri", size: 9.5, italic: !disponible, color: { argb: disponible ? SUCCESS : ORANGE } };
    row.getCell(4).font = { name: "Calibri", size: 10, bold: true, color: { argb: RED_DEEP } };
    row.getCell(4).numFmt = CURRENCY_FMT;
    row.getCell(4).alignment = { horizontal: "right" };
    row.eachCell((cell) => {
      cell.border = { top: thinGray, bottom: thinGray, left: thinGray, right: thinGray };
    });
    return row;
  }

  function addSubtotalRow(nombre: string, subtotal: number) {
    const r = sheet.addRow([`Subtotal ${humanizeProviderName(nombre)}`, null, null, subtotal]);
    sheet.mergeCells(r.number, 1, r.number, 3);
    r.getCell(1).font = { name: "Calibri", size: 9.5, bold: true, color: { argb: STONE } };
    r.getCell(1).alignment = { horizontal: "right" };
    r.getCell(4).font = { name: "Calibri", size: 10, bold: true, color: { argb: INK } };
    r.getCell(4).numFmt = CURRENCY_FMT;
    r.getCell(4).alignment = { horizontal: "right" };
    r.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM_SOFT } };
      cell.border = { top: { style: "thin", color: { argb: "FFE0DAD3" } }, bottom: { style: "double", color: { argb: STONE } } };
    });
    return r;
  }

  let i = 0;
  while (i < rows.length) {
    const nombre = rows[i].nombre_proveedor;
    const group: typeof rows = [];
    while (i < rows.length && rows[i].nombre_proveedor === nombre) {
      group.push(rows[i]);
      i++;
    }
    addGroupHeader(nombre, group.length);
    for (const r of group) addDataRow(r);
    addSubtotalRow(
      nombre,
      group.reduce((s, r) => s + r.valor_bruto, 0)
    );
  }

  sheet.addRow([]);
  const totalRow = sheet.addRow(["TOTAL GENERAL", null, null, total]);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, 3);
  totalRow.height = 22;
  totalRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "right", vertical: "middle" };
  });
  totalRow.getCell(4).numFmt = CURRENCY_FMT;
  totalRow.getCell(4).font = { name: "Calibri", size: 12, bold: true, color: { argb: WHITE } };

  sheet.pageSetup.printArea = `A1:D${totalRow.number}`;

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota" })
    .format(new Date())
    .replace(/\//g, "-");
  const filename = `Notas_Credito_Estrategicos_${stamp}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
