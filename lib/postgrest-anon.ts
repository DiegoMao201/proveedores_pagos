import "server-only";

/**
 * Llama a PostgREST sin autenticacion (rol web_anon). Uso exclusivo: el paso de
 * login (verificar credenciales antes de que exista un JWT de usuario). Vive en
 * un archivo separado de lib/postgrest.ts para evitar un import circular con
 * auth.ts (auth.ts -> este archivo, sin depender de vuelta de @/auth).
 */
export async function postgrestAnonFetch(path: string, init: RequestInit = {}, schema = "public"): Promise<Response> {
  const POSTGREST_URL = process.env.POSTGREST_URL;
  if (!POSTGREST_URL) {
    throw new Error("POSTGREST_URL no esta configurado");
  }
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  // PostgREST solo expone sin encabezado el primer schema de PGRST_DB_SCHEMAS.
  // Cualquier otro schema (auth, treasury, rebate...) requiere Accept-Profile/Content-Profile.
  headers.set("Accept-Profile", schema);
  if (init.method && init.method !== "GET") {
    headers.set("Content-Profile", schema);
  }
  return fetch(`${POSTGREST_URL}${path}`, { ...init, headers, cache: "no-store" });
}
