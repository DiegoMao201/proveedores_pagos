import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import {
  getAllSedeAbonos,
  TIPO_ORIGEN_LABELS,
  type Sede,
  type SedeAbonoEstado,
  type SedeAbonoTipoOrigen,
} from "@/lib/sede-abono-data";
import { humanizeProviderName } from "@/lib/format";

export const runtime = "nodejs";

const RED_DEEP = "FFB21917";
const INK = "FF1A1614";
const STONE = "FF8A827E";
const SUCCESS = "FF4A7A3F";
const ORANGE = "FFF0833A";
const WHITE = "FFFFFFFF";

const CURRENCY_FMT = '"$"#,##0;[Red]-"$"#,##0';

const SEDES: Sede[] = ["Manizales", "Armenia", "Pereira"];
const TIPOS: SedeAbonoTipoOrigen[] = ["planilla", "recibo_caja"];

const ESTADO_LABELS: Record<SedeAbonoEstado, string> = {
  disponible: "Disponible",
  aplicado: "Aplicado a lote",
  anulado: "Anulado",
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const url = new URL(req.url);
  const sp = url.searchParams;
  const sede = SEDES.includes(sp.get("sede") as Sede) ? (sp.get("sede") as Sede) : undefined;
  const estado = (["disponible", "aplicado", "anulado"] as const).includes(sp.get("estado") as SedeAbonoEstado)
    ? (sp.get("estado") as SedeAbonoEstado)
    : undefined;
  const tipoOrigen = TIPOS.includes(sp.get("tipo") as SedeAbonoTipoOrigen) ? (sp.get("tipo") as SedeAbonoTipoOrigen) : undefined;
  const desde = sp.get("desde") ?? undefined;
  const hasta = sp.get("hasta") ?? undefined;

  const abonos = await getAllSedeAbonos({ sede, estado, tipoOrigen, desde: desde ?? undefined, hasta: hasta ?? undefined });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ferreinox — Pagos Proveedores";
  workbook.created = new Date();

  const generado = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

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

  const filtroDescripcion = [
    sede ? `Sede: ${sede}` : null,
    tipoOrigen ? `Motivo: ${TIPO_ORIGEN_LABELS[tipoOrigen]}` : null,
    estado ? `Estado: ${ESTADO_LABELS[estado]}` : null,
    desde ? `Desde: ${desde}` : null,
    hasta ? `Hasta: ${hasta}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // ============ Hoja: Resumen ejecutivo ============
  const resumen = workbook.addWorksheet("Resumen ejecutivo", { pageSetup: pageSetupBase, headerFooter });
  resumen.columns = [{ width: 26 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 4 }];

  const titleRow = resumen.addRow(["FERREINOX"]);
  resumen.mergeCells(titleRow.number, 1, titleRow.number, 4);
  titleRow.height = 30;
  titleRow.getCell(1).font = { name: "Calibri", size: 20, bold: true, color: { argb: RED_DEEP } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const subtitleRow = resumen.addRow(["Reporte de abonos de sedes a proveedores"]);
  resumen.mergeCells(subtitleRow.number, 1, subtitleRow.number, 4);
  subtitleRow.getCell(1).font = { name: "Calibri", size: 12, bold: true, color: { argb: INK } };
  subtitleRow.getCell(1).alignment = { horizontal: "center" };

  const totalGeneral = abonos.filter((a) => a.estado !== "anulado").reduce((s, a) => s + a.valor, 0);
  const summaryRow = resumen.addRow([`${abonos.length} abonos · $${Math.round(totalGeneral).toLocaleString("es-CO")} en total (sin contar anulados)`]);
  resumen.mergeCells(summaryRow.number, 1, summaryRow.number, 4);
  summaryRow.getCell(1).font = { name: "Calibri", size: 10, italic: true, color: { argb: STONE } };
  summaryRow.getCell(1).alignment = { horizontal: "center" };

  if (filtroDescripcion) {
    const filtroRow = resumen.addRow([`Filtros aplicados: ${filtroDescripcion}`]);
    resumen.mergeCells(filtroRow.number, 1, filtroRow.number, 4);
    filtroRow.getCell(1).font = { name: "Calibri", size: 9.5, italic: true, color: { argb: STONE } };
    filtroRow.getCell(1).alignment = { horizontal: "center" };
  }

  const generadoRow = resumen.addRow([`Generado el ${generado}`]);
  resumen.mergeCells(generadoRow.number, 1, generadoRow.number, 4);
  generadoRow.getCell(1).font = { name: "Calibri", size: 9, italic: true, color: { argb: STONE } };
  generadoRow.getCell(1).alignment = { horizontal: "center" };

  resumen.addRow([]);

  // ---- Matriz Sede x Motivo ----
  const matrizTitleRow = resumen.addRow(["Total consignado por sede y motivo"]);
  resumen.mergeCells(matrizTitleRow.number, 1, matrizTitleRow.number, 4);
  matrizTitleRow.getCell(1).font = { name: "Calibri", size: 11, bold: true, color: { argb: INK } };

  const matrizHeaderRow = resumen.addRow(["Sede", TIPO_ORIGEN_LABELS.planilla, TIPO_ORIGEN_LABELS.recibo_caja, "Total sede"]);
  matrizHeaderRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const noAnulados = abonos.filter((a) => a.estado !== "anulado");
  let matrizTotalPlanilla = 0;
  let matrizTotalRecibo = 0;
  for (const s of SEDES) {
    const planillaTotal = noAnulados.filter((a) => a.sede === s && a.tipo_origen === "planilla").reduce((sum, a) => sum + a.valor, 0);
    const reciboTotal = noAnulados.filter((a) => a.sede === s && a.tipo_origen === "recibo_caja").reduce((sum, a) => sum + a.valor, 0);
    matrizTotalPlanilla += planillaTotal;
    matrizTotalRecibo += reciboTotal;
    const row = resumen.addRow([s, planillaTotal, reciboTotal, planillaTotal + reciboTotal]);
    row.getCell(1).font = { bold: true, color: { argb: INK } };
    row.getCell(2).numFmt = CURRENCY_FMT;
    row.getCell(3).numFmt = CURRENCY_FMT;
    row.getCell(4).numFmt = CURRENCY_FMT;
    row.getCell(4).font = { bold: true, color: { argb: INK } };
    row.eachCell((cell) => {
      cell.border = { top: thinGray, bottom: thinGray, left: thinGray, right: thinGray };
    });
  }
  const matrizTotalRow = resumen.addRow(["TOTAL", matrizTotalPlanilla, matrizTotalRecibo, matrizTotalPlanilla + matrizTotalRecibo]);
  matrizTotalRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  matrizTotalRow.getCell(2).numFmt = CURRENCY_FMT;
  matrizTotalRow.getCell(3).numFmt = CURRENCY_FMT;
  matrizTotalRow.getCell(4).numFmt = CURRENCY_FMT;

  resumen.addRow([]);
  resumen.addRow([]);

  // ---- Totales por estado ----
  const estadoTitleRow = resumen.addRow(["Total por estado"]);
  resumen.mergeCells(estadoTitleRow.number, 1, estadoTitleRow.number, 4);
  estadoTitleRow.getCell(1).font = { name: "Calibri", size: 11, bold: true, color: { argb: INK } };

  const estadoHeaderRow = resumen.addRow(["Estado", "# Abonos", "Valor total", null]);
  estadoHeaderRow.eachCell((cell, colNumber) => {
    if (colNumber > 3) return;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const estadoColors: Record<SedeAbonoEstado, string> = { disponible: ORANGE, aplicado: SUCCESS, anulado: STONE };
  (["disponible", "aplicado", "anulado"] as const).forEach((e) => {
    const rows = abonos.filter((a) => a.estado === e);
    const total = rows.reduce((s, a) => s + a.valor, 0);
    const row = resumen.addRow([ESTADO_LABELS[e], rows.length, total]);
    row.getCell(1).font = { bold: true, color: { argb: estadoColors[e] } };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).numFmt = CURRENCY_FMT;
    row.eachCell((cell, colNumber) => {
      if (colNumber > 3) return;
      cell.border = { top: thinGray, bottom: thinGray, left: thinGray, right: thinGray };
    });
  });

  // ============ Hoja: Detalle ============
  const detalle = workbook.addWorksheet("Detalle", { pageSetup: pageSetupBase, headerFooter });
  detalle.columns = [
    { key: "sede", width: 14 },
    { key: "motivo", width: 26 },
    { key: "periodo_desde", width: 14 },
    { key: "periodo_hasta", width: 14 },
    { key: "proveedor", width: 26 },
    { key: "valor", width: 18 },
    { key: "referencia", width: 20 },
    { key: "observaciones", width: 28 },
    { key: "reporto", width: 20 },
    { key: "estado", width: 16 },
    { key: "lote", width: 16 },
  ];

  const dTitle = detalle.addRow(["FERREINOX"]);
  detalle.mergeCells(dTitle.number, 1, dTitle.number, 11);
  dTitle.height = 28;
  dTitle.getCell(1).font = { name: "Calibri", size: 18, bold: true, color: { argb: RED_DEEP } };
  dTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const dSubtitle = detalle.addRow(["Detalle de abonos de sedes"]);
  detalle.mergeCells(dSubtitle.number, 1, dSubtitle.number, 11);
  dSubtitle.getCell(1).font = { name: "Calibri", size: 12, bold: true, color: { argb: INK } };
  dSubtitle.getCell(1).alignment = { horizontal: "center" };

  detalle.addRow([]);

  const dHeaderRow = detalle.addRow([
    "Sede",
    "Motivo",
    "Período desde",
    "Período hasta",
    "Proveedor",
    "Valor",
    "Referencia",
    "Observaciones",
    "Reportó",
    "Estado",
    "Lote aplicado",
  ]);
  dHeaderRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  detalle.views = [{ state: "frozen", ySplit: dHeaderRow.number }];
  detalle.pageSetup.printTitlesRow = `${dHeaderRow.number}:${dHeaderRow.number}`;

  for (const a of abonos) {
    const row = detalle.addRow([
      a.sede,
      TIPO_ORIGEN_LABELS[a.tipo_origen],
      new Date(a.periodo_desde),
      new Date(a.periodo_hasta),
      a.proveedor_nombre ? humanizeProviderName(a.proveedor_nombre) : "—",
      a.valor,
      a.numero_referencia ?? "—",
      a.observaciones ?? "—",
      a.created_by_nombre ?? "—",
      ESTADO_LABELS[a.estado],
      a.codigo_lote ?? "—",
    ]);
    row.getCell(3).numFmt = "d-mmm-yyyy";
    row.getCell(4).numFmt = "d-mmm-yyyy";
    row.getCell(6).numFmt = CURRENCY_FMT;
    row.getCell(6).font = { bold: true, color: { argb: INK } };
    row.getCell(10).font = { color: { argb: estadoColors[a.estado] }, bold: true };
    row.eachCell((cell) => {
      cell.border = { top: thinGray, bottom: thinGray, left: thinGray, right: thinGray };
    });
  }

  detalle.addRow([]);
  const dTotalRow = detalle.addRow(["TOTAL", null, null, null, null, totalGeneral]);
  detalle.mergeCells(dTotalRow.number, 1, dTotalRow.number, 5);
  dTotalRow.eachCell((cell, colNumber) => {
    if (colNumber > 6) return;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  dTotalRow.getCell(6).numFmt = CURRENCY_FMT;
  dTotalRow.getCell(6).alignment = { horizontal: "right" };
  detalle.pageSetup.printArea = `A1:K${dTotalRow.number}`;

  if (abonos.length === 0) {
    const empty = detalle.addRow(["No hay abonos que coincidan con estos filtros."]);
    detalle.mergeCells(empty.number, 1, empty.number, 11);
    empty.getCell(1).font = { italic: true, color: { argb: STONE } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota" }).format(new Date()).replace(/\//g, "-");
  const filename = `Reporte_Abonos_Sedes_${stamp}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
