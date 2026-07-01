import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";

/**
 * Endpoint temporal de verificacion empirica para la Tarea 5 (Fase 0 nucleo).
 * Confirma que postgrestFetch reenvia el JWT del usuario logueado (no un
 * service-account) y que las policies RLS ven el claim app_role correcto.
 * Se elimina una vez cerrada la Fase 0 -- ver checklist de la Tarea 5.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No hay sesion" }, { status: 401 });
  }

  const [, payloadB64] = session.accessToken.split(".");
  const decodedPayload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));

  const res = await postgrestFetch("/provider?limit=1", {}, "providers");
  const body = await res.text();

  return NextResponse.json({
    jwt_payload_sin_firma: decodedPayload,
    postgrest_status: res.status,
    postgrest_body: body,
  });
}
