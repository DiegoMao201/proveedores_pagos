import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";

/**
 * Endpoint TEMPORAL de verificacion empirica para la Fase 0 nucleo (Tareas 5 y 8).
 * Se elimina antes de cerrar la Fase 0 -- ver checklist.
 *
 * Deliberadamente NO se restringe a session.user.role === "admin": su proposito
 * es precisamente verificar el comportamiento real de RLS para tesoreria/
 * contabilidad/gerencia iniciando sesion COMO esos roles. Gatearlo a admin
 * rompería la razon de ser de la herramienta. En su lugar, la defensa es:
 *   1) Killswitch: DEBUG_ENDPOINTS_ENABLED debe ser exactamente "true", si no
 *      responde 404 (ni confirma que el endpoint existe).
 *   2) Allowlist de IP: DEBUG_ALLOWED_IPS (coma-separado). Si esta seteada,
 *      solo esas IPs pasan.
 *   3) Requiere una sesion autenticada valida (cualquier rol) -- no es un
 *      endpoint anonimo.
 */
function guardOrDeny(request: NextRequest): NextResponse | null {
  if (process.env.DEBUG_ENDPOINTS_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowlist = (process.env.DEBUG_ALLOWED_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (allowlist.length > 0) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "";
    if (!allowlist.includes(clientIp)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return null;
}

async function handle(request: NextRequest) {
  const denied = guardOrDeny(request);
  if (denied) return denied;

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No hay sesion" }, { status: 401 });
  }

  const [, payloadB64] = session.accessToken.split(".");
  const decodedPayload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));

  const path = request.nextUrl.searchParams.get("path") ?? "/provider?limit=1";
  const schema = request.nextUrl.searchParams.get("schema") ?? "providers";

  const init: RequestInit = { method: request.method };
  if (request.method === "POST") {
    init.body = await request.text();
  }

  const res = await postgrestFetch(path, init, schema);
  const body = await res.text();

  return NextResponse.json({
    jwt_payload_sin_firma: decodedPayload,
    postgrest_status: res.status,
    postgrest_body: body,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
