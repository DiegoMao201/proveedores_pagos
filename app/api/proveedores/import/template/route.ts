import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";

export const runtime = "nodejs";

const RED_DEEP = "FFB21917";
const CREAM = "FFFEF4C0";
const CREAM_SOFT = "FFFDFAEB";
const INK = "FF1A1614";
const STONE = "FF8A827E";
const WHITE = "FFFFFFFF";

const CATEGORIAS = ["estrategico", "operativo", "locativo", "esporadico", "institucional"];
const FORMAS_PAGO = ["transferencia", "cheque", "efectivo", "tarjeta", "pse"];
const SI_NO = ["Sí", "No"];

const COLUMNS = [
  { header: "Nombre*", width: 34 },
  { header: "NIT", width: 16 },
  { header: "Categoría", width: 16 },
  { header: "Activo", width: 10 },
  { header: "Plazo de pago (días)", width: 16 },
  { header: "Forma de pago", width: 16 },
  { header: "Límite de crédito", width: 18 },
  { header: "Día de corte de pagos", width: 16 },
  { header: "Detección de anomalías", width: 16 },
  { header: "Email de pago", width: 26 },
  { header: "Teléfono", width: 16 },
  { header: "Contacto nombre", width: 22 },
  { header: "Contacto cargo", width: 20 },
  { header: "Observaciones", width: 30 },
];

const EXAMPLE_ROW = [
  "EJEMPLO S.A.S — BORRAR ESTA FILA",
  "900123456",
  "estrategico",
  "Sí",
  30,
  "transferencia",
  "",
  "",
  "Sí",
  "pagos@ejemplo.com",
  "3001234567",
  "Juana Pérez",
  "Tesorería",
  "Proveedor de ejemplo, borrar antes de subir",
];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ferreinox — Pagos Proveedores";
  workbook.created = new Date();

  // ============ Hoja: Instrucciones ============
  const instrucciones = workbook.addWorksheet("Instrucciones");
  instrucciones.columns = [{ width: 30 }, { width: 70 }];

  const title = instrucciones.addRow(["FERREINOX — Plantilla de importación masiva de proveedores"]);
  instrucciones.mergeCells(title.number, 1, title.number, 2);
  title.getCell(1).font = { name: "Calibri", size: 16, bold: true, color: { argb: RED_DEEP } };
  title.height = 26;

  instrucciones.addRow([]);
  const intro = instrucciones.addRow([
    "Completa la hoja \"Proveedores\" con un proveedor por fila. Al subir el archivo, el sistema te mostrará una vista previa antes de guardar nada — podrás revisar qué se va a crear y qué se va a actualizar.",
  ]);
  instrucciones.mergeCells(intro.number, 1, intro.number, 2);
  intro.getCell(1).font = { name: "Calibri", size: 11, color: { argb: INK } };
  intro.getCell(1).alignment = { wrapText: true };
  instrucciones.getRow(intro.number).height = 40;

  const matchRow = instrucciones.addRow([
    "¿Cómo decide si crea o actualiza?",
    "Si el NIT coincide con un proveedor ya existente, se ACTUALIZA. Si no hay NIT pero el Nombre coincide con uno existente, también se ACTUALIZA. Si no coincide con nada, se CREA como proveedor nuevo.",
  ]);
  matchRow.getCell(1).font = { bold: true, size: 10.5, color: { argb: INK } };
  matchRow.getCell(2).font = { size: 10.5, color: { argb: INK } };
  matchRow.getCell(2).alignment = { wrapText: true };
  instrucciones.getRow(matchRow.number).height = 45;

  instrucciones.addRow([]);
  const camposHeader = instrucciones.addRow(["Columna", "Detalle"]);
  camposHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
  });

  const detalles: [string, string][] = [
    ["Nombre*", "Obligatorio. Razón social del proveedor."],
    ["NIT", "Opcional, pero se recomienda siempre que se conozca — es la forma más segura de identificar al proveedor."],
    ["Categoría", `Opcional. Valores válidos: ${CATEGORIAS.join(", ")}. Se puede dejar en blanco.`],
    ["Activo", "Sí o No. Si se deja en blanco se asume Sí."],
    ["Plazo de pago (días)", "Número entero, opcional."],
    ["Forma de pago", `Opcional. Valores válidos: ${FORMAS_PAGO.join(", ")}.`],
    ["Límite de crédito", "Número, opcional."],
    ["Día de corte de pagos", "Número entre 1 y 31, opcional."],
    ["Detección de anomalías", "Sí o No. Si se deja en blanco se asume Sí."],
    ["Email de pago", "Opcional."],
    ["Teléfono", "Opcional."],
    ["Contacto nombre", "Opcional."],
    ["Contacto cargo", "Opcional."],
    ["Observaciones", "Opcional, texto libre."],
  ];
  for (const [col, det] of detalles) {
    const r = instrucciones.addRow([col, det]);
    r.getCell(1).font = { bold: true, size: 10, color: { argb: INK } };
    r.getCell(2).font = { size: 10, color: { argb: STONE } };
    r.getCell(2).alignment = { wrapText: true };
  }

  const nota = instrucciones.addRow([
    "Nota importante",
    "Las cuentas bancarias o el medio de pago (transferencia / portal del proveedor) NO se cargan desde este archivo — se configuran después, uno por uno, desde el perfil de cada proveedor. Esto es intencional para evitar errores en datos bancarios.",
  ]);
  nota.getCell(1).font = { bold: true, size: 10.5, color: { argb: RED_DEEP } };
  nota.getCell(2).font = { size: 10.5, color: { argb: INK } };
  nota.getCell(2).alignment = { wrapText: true };
  instrucciones.getRow(nota.number).height = 45;

  // ============ Hoja: Proveedores (datos a llenar) ============
  const sheet = workbook.addWorksheet("Proveedores", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = COLUMNS.map((c) => ({ width: c.width }));

  const headerRow = sheet.addRow(COLUMNS.map((c) => c.header));
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  headerRow.height = 32;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const exampleRow = sheet.addRow(EXAMPLE_ROW);
  exampleRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: STONE }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM_SOFT } };
  });

  const FIRST_BLANK_ROW = 3;
  const LAST_BLANK_ROW = 502;
  for (let r = FIRST_BLANK_ROW; r <= LAST_BLANK_ROW; r++) {
    sheet.getCell(r, 3).dataValidation = { type: "list", allowBlank: true, formulae: [`"${CATEGORIAS.join(",")}"`] };
    sheet.getCell(r, 4).dataValidation = { type: "list", allowBlank: true, formulae: [`"${SI_NO.join(",")}"`] };
    sheet.getCell(r, 6).dataValidation = { type: "list", allowBlank: true, formulae: [`"${FORMAS_PAGO.join(",")}"`] };
    sheet.getCell(r, 9).dataValidation = { type: "list", allowBlank: true, formulae: [`"${SI_NO.join(",")}"`] };
  }
  sheet.getCell(2, 4).dataValidation = { type: "list", allowBlank: true, formulae: [`"${SI_NO.join(",")}"`] };
  sheet.getCell(2, 9).dataValidation = { type: "list", allowBlank: true, formulae: [`"${SI_NO.join(",")}"`] };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Plantilla_Importacion_Proveedores.xlsx"`,
    },
  });
}
