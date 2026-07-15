import "server-only";
import { postgrestFetch } from "@/lib/postgrest";
import { TIPO_ORIGEN_LABELS, type Sede, type SedeAbonoEstado, type SedeAbonoTipoOrigen, type SedeAbonoRow } from "@/lib/sede-abono-shared";

export { TIPO_ORIGEN_LABELS };
export type { Sede, SedeAbonoEstado, SedeAbonoTipoOrigen, SedeAbonoRow };

export async function getMisSedeAbonos(): Promise<SedeAbonoRow[]> {
  const res = await postgrestFetch("/v_sede_abono?select=*&order=periodo_desde.desc,id.desc", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_sede_abono -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface SedeAbonoFilters {
  sede?: Sede;
  estado?: SedeAbonoEstado;
  tipoOrigen?: SedeAbonoTipoOrigen;
  desde?: string;
  hasta?: string;
}

function buildFilterParams(filters: SedeAbonoFilters): URLSearchParams {
  const params = new URLSearchParams({ select: "*", order: "periodo_desde.desc,id.desc" });
  if (filters.sede) params.set("sede", `eq.${filters.sede}`);
  if (filters.estado) params.set("estado", `eq.${filters.estado}`);
  if (filters.tipoOrigen) params.set("tipo_origen", `eq.${filters.tipoOrigen}`);
  // El período de cada abono es un rango (periodo_desde..periodo_hasta), no
  // una fecha puntual -- filtrar por "desde/hasta" busca cualquier abono
  // cuyo período se traslape con el rango pedido (interseccion de rangos),
  // no que caiga exactamente dentro.
  if (filters.desde) params.set("periodo_hasta", `gte.${filters.desde}`);
  if (filters.hasta) params.set("periodo_desde", `lte.${filters.hasta}`);
  return params;
}

export async function getAllSedeAbonos(filters: SedeAbonoFilters = {}): Promise<SedeAbonoRow[]> {
  const params = buildFilterParams(filters);
  const res = await postgrestFetch(`/v_sede_abono?${params.toString()}`, {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_sede_abono -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getAvailableSedeAbonosForProvider(providerId: number): Promise<SedeAbonoRow[]> {
  const res = await postgrestFetch(
    `/v_sede_abono?provider_id=eq.${providerId}&estado=eq.disponible&select=*&order=periodo_desde.asc`,
    {},
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST /v_sede_abono -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getAppliedSedeAbonosForBatch(batchId: number): Promise<SedeAbonoRow[]> {
  const res = await postgrestFetch(`/v_sede_abono?batch_id=eq.${batchId}&select=*&order=periodo_desde.asc`, {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_sede_abono -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getSedeAbonoComprobante(abonoId: number): Promise<{ contenido: string; mime: string } | null> {
  const res = await postgrestFetch(
    `/sede_abono?id=eq.${abonoId}&select=comprobante_contenido,comprobante_mime`,
    {},
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST /sede_abono -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as { comprobante_contenido: string; comprobante_mime: string }[];
  const row = rows[0];
  if (!row) return null;
  return { contenido: row.comprobante_contenido, mime: row.comprobante_mime };
}

export async function getPintucoProviderId(): Promise<number> {
  const res = await postgrestFetch(
    `/provider?nombre_normalizado=eq.PINTUCOCOLOMBIASAS&select=id`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /provider -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as { id: number }[];
  if (!rows[0]) throw new Error("No se encontró el proveedor Pintuco (nombre_normalizado=PINTUCOCOLOMBIASAS)");
  return rows[0].id;
}
