import "server-only";
import { auth } from "@/auth";

/**
 * Llama a PostgREST usando el JWT del usuario logueado (nunca un service-account
 * compartido) para que las policies RLS se apliquen con la identidad correcta.
 * Ver ADDENDUM seccion D.4: este es el error mas comun y mas grave al conectar
 * Next.js con PostgREST.
 */
export async function postgrestFetch(path: string, init: RequestInit = {}, schema = "public"): Promise<Response> {
  const POSTGREST_URL = process.env.POSTGREST_URL;
  if (!POSTGREST_URL) {
    throw new Error("POSTGREST_URL no esta configurado");
  }
  const session = await auth();
  const accessToken = session?.accessToken;
  if (!accessToken) {
    throw new Error("No hay sesion activa: postgrestFetch requiere un usuario logueado");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  // PostgREST solo expone sin encabezado el primer schema de PGRST_DB_SCHEMAS.
  headers.set("Accept-Profile", schema);
  if (init.method && init.method !== "GET") {
    headers.set("Content-Profile", schema);
  }

  return fetch(`${POSTGREST_URL}${path}`, { ...init, headers, cache: "no-store" });
}
