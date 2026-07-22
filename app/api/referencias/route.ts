import { NextResponse } from "next/server";
import { buscarReferenciaFacturada } from "@/lib/referencia-data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const referencia = searchParams.get("ref")?.trim() ?? "";
  if (!referencia) return NextResponse.json({ error: "Falta el parámetro 'ref'." }, { status: 400 });

  try {
    const rows = await buscarReferenciaFacturada(referencia);
    return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 });
  }
}
