import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import { getBatchByCode } from "@/lib/batch-data";
import { markBatchExported } from "@/lib/lotes-actions";

export const runtime = "nodejs";

interface PabDetalle {
  tipo_documento_beneficiario: number;
  nit_beneficiario: string;
  nombre_beneficiario: string;
  tipo_transaccion: number;
  codigo_banco: number;
  numero_cuenta: string;
  email: string | null;
  documento_autorizado: string;
  referencia: string;
  celular: string;
  valor_transaccion: number;
  fecha_aplicacion: string;
}

interface PabStructure {
  error?: string;
  proveedores_afectados?: string[];
  sin_pab_requerido?: boolean;
  motivo?: string;
  cabecera?: {
    nit_pagador: string;
    tipo_pago: string;
    aplicacion: string;
    secuencia_envio: string;
    nro_cuenta_debitar: string;
    tipo_cuenta_debitar: string;
    descripcion_pago: string;
  };
  detalle?: PabDetalle[];
  metadata?: {
    proveedores_via_portal?: string[];
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const { codigo } = await params;
  const batch = await getBatchByCode(codigo);
  if (!batch) return NextResponse.json({ error: "BATCH_NOT_FOUND" }, { status: 404 });

  const pabRes = await postgrestFetch(
    "/rpc/generate_pab_structure",
    { method: "POST", body: JSON.stringify({ p_batch_id: batch.id }) },
    "treasury"
  );
  if (!pabRes.ok) return NextResponse.json({ error: `HTTP ${pabRes.status}: ${await pabRes.text()}` }, { status: 500 });

  const pab = (await pabRes.json()) as PabStructure;

  if (pab.sin_pab_requerido) {
    const markResult = await markBatchExported(batch.id, batch.codigo_lote);
    if (!markResult.ok) {
      return NextResponse.json({ error: markResult.error ?? "NO_SE_PUDO_MARCAR_EXPORTADO" }, { status: 400 });
    }
    return NextResponse.json({
      sin_pab_requerido: true,
      mensaje: pab.motivo ?? "Este lote no requiere archivo PAB.",
    });
  }

  if (pab.error || !pab.cabecera || !pab.detalle) {
    return NextResponse.json({ error: pab.error ?? "PAB_STRUCTURE_EMPTY", proveedores_afectados: pab.proveedores_afectados }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("FORMATOPAB");

  sheet.addRow([
    "NIT PAGADOR", "TIPO DE PAGO", "APLICACIÓN", "SECUENCIA DE ENVÍO",
    "NRO CUENTA A DEBITAR", "TIPO DE CUENTA A DEBITAR", "DESCRIPCIÓN DEL PAGO",
  ]);
  const c = pab.cabecera;
  sheet.addRow([c.nit_pagador, c.tipo_pago, c.aplicacion, c.secuencia_envio, c.nro_cuenta_debitar, c.tipo_cuenta_debitar, c.descripcion_pago]);

  sheet.addRow([
    "Tipo Documento Beneficiario", "Nit Beneficiario", "Nombre Beneficiario ",
    "Tipo Transaccion ", "Código Banco ", "No Cuenta Beneficiario ",
    "Email ", "Documento Autorizado ", "Referencia ",
    "Celular Beneficiario", "ValorTransaccion ", "Fecha de aplicación",
  ]);
  for (const item of pab.detalle) {
    sheet.addRow([
      item.tipo_documento_beneficiario, item.nit_beneficiario, item.nombre_beneficiario,
      item.tipo_transaccion, item.codigo_banco, item.numero_cuenta,
      item.email, item.documento_autorizado, item.referencia,
      item.celular, Math.round(item.valor_transaccion), item.fecha_aplicacion,
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const markResult = await markBatchExported(batch.id, batch.codigo_lote);
  if (!markResult.ok) {
    return NextResponse.json({ error: markResult.error ?? "NO_SE_PUDO_MARCAR_EXPORTADO" }, { status: 400 });
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
  const filename = `PAB_${codigo}_${stamp}.xlsx`;

  const proveedoresPortal = pab.metadata?.proveedores_via_portal ?? [];
  const headers: Record<string, string> = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
  if (proveedoresPortal.length > 0) {
    headers["X-Proveedores-Via-Portal"] = encodeURIComponent(proveedoresPortal.join(", "));
  }

  return new NextResponse(buffer as unknown as BodyInit, { headers });
}
