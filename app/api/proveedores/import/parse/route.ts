import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import type { ProviderImportRow } from "@/lib/provider-actions";

export const runtime = "nodejs";

const CATEGORIAS = new Set(["estrategico", "operativo", "locativo", "esporadico", "institucional"]);
const FORMAS_PAGO = new Set(["transferencia", "cheque", "efectivo", "tarjeta", "pse"]);

function normalizeProviderName(nombre: string): string {
  return nombre
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in (v as object)) {
    return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
  }
  return String(v).trim();
}

function cellNumber(cell: ExcelJS.Cell): { value: number | null; invalid: boolean } {
  const text = cellText(cell);
  if (!text) return { value: null, invalid: false };
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) ? { value: n, invalid: false } : { value: null, invalid: true };
}

function parseSiNo(cell: ExcelJS.Cell): boolean {
  const text = cellText(cell).toLowerCase();
  if (!text) return true;
  return text === "sí" || text === "si" || text === "s" || text === "true" || text === "1";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    return NextResponse.json({ error: "ARCHIVO_INVALIDO" }, { status: 400 });
  }

  const sheet = workbook.getWorksheet("Proveedores");
  if (!sheet) return NextResponse.json({ error: "HOJA_PROVEEDORES_NO_ENCONTRADA" }, { status: 400 });

  const existingRes = await postgrestFetch("/provider?select=id,nif,nombre_normalizado", {}, "providers");
  if (!existingRes.ok) return NextResponse.json({ error: `HTTP ${existingRes.status}: ${await existingRes.text()}` }, { status: 500 });
  const existing = (await existingRes.json()) as { id: number; nif: string | null; nombre_normalizado: string }[];
  const byNif = new Map(existing.filter((p) => p.nif).map((p) => [p.nif!.trim(), p.id]));
  const byNombreNorm = new Map(existing.map((p) => [p.nombre_normalizado, p.id]));

  const rows: (ProviderImportRow & { errores: string[]; omitida: boolean })[] = [];
  const nifVistos = new Map<string, number>();
  const nombresVistos = new Map<string, number>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const nombre = cellText(row.getCell(1));
    const nif = cellText(row.getCell(2)) || null;
    const categoriaRaw = cellText(row.getCell(3)).toLowerCase();
    const activo = parseSiNo(row.getCell(4));
    const plazo = cellNumber(row.getCell(5));
    const formaRaw = cellText(row.getCell(6)).toLowerCase();
    const limite = cellNumber(row.getCell(7));
    const diaCorte = cellNumber(row.getCell(8));
    const anomalyDetection = parseSiNo(row.getCell(9));
    const emailPago = cellText(row.getCell(10)) || null;
    const telefono = cellText(row.getCell(11)) || null;
    const contactoPagos = cellText(row.getCell(12)) || null;
    const contactoCargo = cellText(row.getCell(13)) || null;
    const observaciones = cellText(row.getCell(14)) || null;

    if (!nombre && !nif) return; // fila completamente vacía

    if (nombre.toUpperCase().includes("BORRAR ESTA FILA")) {
      rows.push({
        rowNumber,
        nombre,
        nif,
        categoria_proveedor: null,
        activo: true,
        plazo_pago_dias: null,
        forma_pago: null,
        limite_credito: null,
        dia_corte_pagos: null,
        anomaly_detection: true,
        email_pago: null,
        telefono: null,
        contacto_pagos: null,
        contacto_cargo: null,
        observaciones: null,
        accion: "crear",
        proveedor_id: null,
        errores: [],
        omitida: true,
      });
      return;
    }

    const errores: string[] = [];
    if (!nombre) errores.push("Falta el nombre");
    if (categoriaRaw && !CATEGORIAS.has(categoriaRaw)) errores.push(`Categoría inválida: "${categoriaRaw}"`);
    if (formaRaw && !FORMAS_PAGO.has(formaRaw)) errores.push(`Forma de pago inválida: "${formaRaw}"`);
    if (plazo.invalid) errores.push("Plazo de pago no es un número válido");
    if (limite.invalid) errores.push("Límite de crédito no es un número válido");
    if (diaCorte.invalid) errores.push("Día de corte no es un número válido");
    if (diaCorte.value !== null && (diaCorte.value < 1 || diaCorte.value > 31)) errores.push("Día de corte debe estar entre 1 y 31");

    if (nif) {
      if (nifVistos.has(nif)) errores.push(`NIT duplicado en el archivo (también en fila ${nifVistos.get(nif)})`);
      else nifVistos.set(nif, rowNumber);
    }
    const nombreNorm = nombre ? normalizeProviderName(nombre) : "";
    if (nombreNorm) {
      if (nombresVistos.has(nombreNorm) && !nif) errores.push(`Nombre duplicado en el archivo (también en fila ${nombresVistos.get(nombreNorm)})`);
      else nombresVistos.set(nombreNorm, rowNumber);
    }

    let accion: "crear" | "actualizar" = "crear";
    let proveedorId: number | null = null;
    if (nif && byNif.has(nif)) {
      accion = "actualizar";
      proveedorId = byNif.get(nif)!;
    } else if (nombreNorm && byNombreNorm.has(nombreNorm)) {
      accion = "actualizar";
      proveedorId = byNombreNorm.get(nombreNorm)!;
    }

    rows.push({
      rowNumber,
      nombre,
      nif,
      categoria_proveedor: categoriaRaw || null,
      activo,
      plazo_pago_dias: plazo.value,
      forma_pago: formaRaw || null,
      limite_credito: limite.value,
      dia_corte_pagos: diaCorte.value,
      anomaly_detection: anomalyDetection,
      email_pago: emailPago,
      telefono,
      contacto_pagos: contactoPagos,
      contacto_cargo: contactoCargo,
      observaciones,
      accion,
      proveedor_id: proveedorId,
      errores,
      omitida: false,
    });
  });

  return NextResponse.json({ rows });
}
