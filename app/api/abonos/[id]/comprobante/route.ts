import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSedeAbonoComprobante } from "@/lib/sede-abono-data";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const { id } = await params;
  const abonoId = Number(id);
  if (!Number.isFinite(abonoId)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

  const comprobante = await getSedeAbonoComprobante(abonoId);
  if (!comprobante) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // PostgREST devuelve bytea en el formato hex de Postgres ("\x..."), no base64.
  const hex = comprobante.contenido.startsWith("\\x") ? comprobante.contenido.slice(2) : comprobante.contenido;
  const bytes = Buffer.from(hex, "hex");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": comprobante.mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
