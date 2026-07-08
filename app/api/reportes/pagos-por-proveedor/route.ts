import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { getBatchesSummaryList, getBatchProviderBreakdownForBatches } from "@/lib/lotes-data";
import { getBankCatalog } from "@/lib/bank-account-data";
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

const CATEGORIA_LABELS: Record<string, string> = {
  estrategico: "Estratégico",
  locativo: "Locativo",
  institucional: "Institucional",
};

function sanitizeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[\\/?*[\]:]/g, "").trim().slice(0, 28);
  if (!base) base = "Proveedor";
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base.slice(0, 25)} (${n})`;
    n++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const [batches, bankCatalog] = await Promise.all([getBatchesSummaryList(), getBankCatalog()]);
  const paidBatches = batches.filter((b) => b.estado === "paid");
  const breakdown = await getBatchProviderBreakdownForBatches(paidBatches.map((b) => b.id));

  const batchById = new Map(paidBatches.map((b) => [b.id, b]));
  const bankNameByCode = new Map(bankCatalog.map((b) => [b.codigo, b.nombre]));

  interface Fila {
    codigo_lote: string;
    fecha_pago: string | null;
    num_facturas: number;
    num_ncs: number;
    total_bruto_facturas: number;
    total_descuento: number;
    total_retenciones: number;
    total_neto: number;
    medio_pago: string | null;
    detalle_medio: string;
  }
  interface ProveedorGrupo {
    proveedor_id: number;
    nombre: string;
    categoria: string;
    nit: string | null;
    filas: Fila[];
  }

  const grupos = new Map<number, ProveedorGrupo>();
  for (const row of breakdown) {
    const batch = batchById.get(row.batch_id);
    if (!batch) continue;
    if (!grupos.has(row.proveedor_id)) {
      grupos.set(row.proveedor_id, {
        proveedor_id: row.proveedor_id,
        nombre: row.proveedor_nombre,
        categoria: row.categoria_proveedor,
        nit: row.proveedor_nit,
        filas: [],
      });
    }
    const esPortal = row.medio_pago === "portal_proveedor";
    const detalle_medio = esPortal
      ? "Portal del proveedor"
      : row.banco_destino_codigo
      ? `${bankNameByCode.get(row.banco_destino_codigo) ?? `Banco ${row.banco_destino_codigo}`} · ${row.cuenta_destino ?? ""}`
      : "—";
    grupos.get(row.proveedor_id)!.filas.push({
      codigo_lote: batch.codigo_lote,
      fecha_pago: batch.paid_at,
      num_facturas: row.num_facturas,
      num_ncs: row.num_ncs,
      total_bruto_facturas: row.total_bruto_facturas ?? 0,
      total_descuento: row.total_descuento ?? 0,
      total_retenciones: row.total_retenciones ?? 0,
      total_neto: row.total_neto,
      medio_pago: row.medio_pago,
      detalle_medio,
    });
  }

  const proveedoresOrdenados = Array.from(grupos.values()).sort(
    (a, b) => b.filas.reduce((s, f) => s + f.total_neto, 0) - a.filas.reduce((s, f) => s + f.total_neto, 0)
  );

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

  // ============ Hoja: Resumen ejecutivo ============
  const resumen = workbook.addWorksheet("Resumen ejecutivo", { pageSetup: pageSetupBase, headerFooter });
  resumen.columns = [
    { key: "proveedor", width: 34 },
    { key: "categoria", width: 16 },
    { key: "lotes", width: 10 },
    { key: "total", width: 20 },
    { key: "ultimo", width: 16 },
    { key: "medio", width: 22 },
  ];
  const totalGeneral = proveedoresOrdenados.reduce((s, p) => s + p.filas.reduce((s2, f) => s2 + f.total_neto, 0), 0);

  const titleRow = resumen.addRow(["FERREINOX"]);
  resumen.mergeCells(titleRow.number, 1, titleRow.number, 6);
  titleRow.height = 30;
  titleRow.getCell(1).font = { name: "Calibri", size: 20, bold: true, color: { argb: RED_DEEP } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const subtitleRow = resumen.addRow(["Reporte ejecutivo de pagos realizados a proveedores"]);
  resumen.mergeCells(subtitleRow.number, 1, subtitleRow.number, 6);
  subtitleRow.getCell(1).font = { name: "Calibri", size: 12, bold: true, color: { argb: INK } };
  subtitleRow.getCell(1).alignment = { horizontal: "center" };

  const summaryRow = resumen.addRow([
    `${proveedoresOrdenados.length} proveedores · ${paidBatches.length} lotes pagados · $${Math.round(totalGeneral).toLocaleString("es-CO")} en total`,
  ]);
  resumen.mergeCells(summaryRow.number, 1, summaryRow.number, 6);
  summaryRow.getCell(1).font = { name: "Calibri", size: 10, italic: true, color: { argb: STONE } };
  summaryRow.getCell(1).alignment = { horizontal: "center" };

  const generadoRow = resumen.addRow([`Generado el ${generado}`]);
  resumen.mergeCells(generadoRow.number, 1, generadoRow.number, 6);
  generadoRow.getCell(1).font = { name: "Calibri", size: 9, italic: true, color: { argb: STONE } };
  generadoRow.getCell(1).alignment = { horizontal: "center" };

  resumen.addRow([]);

  const resumenHeaderRow = resumen.addRow(["Proveedor", "Categoría", "# Lotes", "Total pagado", "Último pago", "Medio de pago"]);
  resumenHeaderRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  resumen.views = [{ state: "frozen", ySplit: resumenHeaderRow.number }];
  resumen.pageSetup.printTitlesRow = `${resumenHeaderRow.number}:${resumenHeaderRow.number}`;

  const thinGray = { style: "thin" as const, color: { argb: "FFE0DAD3" } };
  const sheetNamesUsed = new Set<string>(["resumen ejecutivo"]);

  for (const p of proveedoresOrdenados) {
    const totalProveedor = p.filas.reduce((s, f) => s + f.total_neto, 0);
    const ultimoPago = p.filas.reduce<string | null>((max, f) => (f.fecha_pago && (!max || f.fecha_pago > max) ? f.fecha_pago : max), null);
    const medios = new Set(p.filas.map((f) => f.medio_pago ?? "transferencia"));
    const medioLabel = medios.size > 1 ? "Mixto" : medios.has("portal_proveedor") ? "Portal proveedor" : "Transferencia";

    const row = resumen.addRow([
      humanizeProviderName(p.nombre),
      CATEGORIA_LABELS[p.categoria] ?? p.categoria,
      p.filas.length,
      totalProveedor,
      ultimoPago ? new Date(ultimoPago) : null,
      medioLabel,
    ]);
    row.getCell(4).numFmt = CURRENCY_FMT;
    row.getCell(4).font = { bold: true, color: { argb: INK } };
    row.getCell(5).numFmt = "d-mmm-yyyy";
    row.getCell(3).alignment = { horizontal: "center" };
    row.eachCell((cell) => {
      cell.border = { top: thinGray, bottom: thinGray, left: thinGray, right: thinGray };
    });
  }

  resumen.addRow([]);
  const totalRow = resumen.addRow(["TOTAL GENERAL", null, paidBatches.length, totalGeneral]);
  resumen.mergeCells(totalRow.number, 1, totalRow.number, 2);
  totalRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  totalRow.getCell(4).numFmt = CURRENCY_FMT;
  totalRow.getCell(4).alignment = { horizontal: "right" };
  resumen.pageSetup.printArea = `A1:F${totalRow.number}`;

  // ============ Una hoja por proveedor ============
  for (const p of proveedoresOrdenados) {
    const sheetName = sanitizeSheetName(humanizeProviderName(p.nombre), sheetNamesUsed);
    const sheet = workbook.addWorksheet(sheetName, { pageSetup: pageSetupBase, headerFooter });
    sheet.columns = [
      { key: "lote", width: 16 },
      { key: "fecha", width: 14 },
      { key: "docs", width: 12 },
      { key: "bruto", width: 18 },
      { key: "descuento", width: 16 },
      { key: "retenciones", width: 16 },
      { key: "neto", width: 18 },
      { key: "medio", width: 30 },
    ];

    const pTitle = sheet.addRow(["FERREINOX"]);
    sheet.mergeCells(pTitle.number, 1, pTitle.number, 8);
    pTitle.height = 28;
    pTitle.getCell(1).font = { name: "Calibri", size: 18, bold: true, color: { argb: RED_DEEP } };
    pTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

    const pSubtitle = sheet.addRow([
      `${humanizeProviderName(p.nombre)}${p.nit ? ` · NIT ${p.nit}` : ""} — Historial de pagos realizados`,
    ]);
    sheet.mergeCells(pSubtitle.number, 1, pSubtitle.number, 8);
    pSubtitle.getCell(1).font = { name: "Calibri", size: 12, bold: true, color: { argb: INK } };
    pSubtitle.getCell(1).alignment = { horizontal: "center" };

    const totalProveedor = p.filas.reduce((s, f) => s + f.total_neto, 0);
    const pSummary = sheet.addRow([
      `${p.filas.length} ${p.filas.length === 1 ? "lote" : "lotes"} pagados · $${Math.round(totalProveedor).toLocaleString("es-CO")} en total`,
    ]);
    sheet.mergeCells(pSummary.number, 1, pSummary.number, 8);
    pSummary.getCell(1).font = { name: "Calibri", size: 10, italic: true, color: { argb: STONE } };
    pSummary.getCell(1).alignment = { horizontal: "center" };

    sheet.addRow([]);

    const headerRow = sheet.addRow(["Lote", "Fecha de pago", "Documentos", "Bruto", "Descuento", "Retenciones", "Neto", "Medio de pago"]);
    headerRow.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
    sheet.pageSetup.printTitlesRow = `${headerRow.number}:${headerRow.number}`;

    const filasOrdenadas = [...p.filas].sort((a, b) => (b.fecha_pago ?? "").localeCompare(a.fecha_pago ?? ""));
    for (const f of filasOrdenadas) {
      const row = sheet.addRow([
        f.codigo_lote,
        f.fecha_pago ? new Date(f.fecha_pago) : null,
        `${f.num_facturas} fact.${f.num_ncs > 0 ? ` + ${f.num_ncs} NC` : ""}`,
        f.total_bruto_facturas,
        f.total_descuento,
        f.total_retenciones,
        f.total_neto,
        f.detalle_medio,
      ]);
      row.getCell(2).numFmt = "d-mmm-yyyy";
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(4).numFmt = CURRENCY_FMT;
      row.getCell(5).numFmt = CURRENCY_FMT;
      row.getCell(5).font = { color: { argb: SUCCESS } };
      row.getCell(6).numFmt = CURRENCY_FMT;
      row.getCell(6).font = { color: { argb: ORANGE } };
      row.getCell(7).numFmt = CURRENCY_FMT;
      row.getCell(7).font = { bold: true, color: { argb: INK } };
      row.eachCell((cell) => {
        cell.border = { top: thinGray, bottom: thinGray, left: thinGray, right: thinGray };
      });
    }

    sheet.addRow([]);
    const pTotalRow = sheet.addRow(["TOTAL", null, null, null, null, null, totalProveedor]);
    sheet.mergeCells(pTotalRow.number, 1, pTotalRow.number, 6);
    pTotalRow.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
      cell.alignment = { horizontal: "right", vertical: "middle" };
    });
    pTotalRow.getCell(7).numFmt = CURRENCY_FMT;
    pTotalRow.getCell(7).alignment = { horizontal: "right" };
    sheet.pageSetup.printArea = `A1:H${pTotalRow.number}`;
  }

  if (proveedoresOrdenados.length === 0) {
    const empty = resumen.addRow(["No hay lotes pagados todavía."]);
    resumen.mergeCells(empty.number, 1, empty.number, 6);
    empty.getCell(1).font = { italic: true, color: { argb: STONE } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota" }).format(new Date()).replace(/\//g, "-");
  const filename = `Reporte_Pagos_Por_Proveedor_${stamp}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
