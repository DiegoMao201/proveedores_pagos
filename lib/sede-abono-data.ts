import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export type Sede = "Manizales" | "Armenia" | "Pereira";
export type SedeAbonoEstado = "disponible" | "aplicado" | "anulado";

export interface SedeAbonoRow {
  id: number;
  provider_id: number;
  proveedor_nombre: string | null;
  sede: Sede;
  fecha_consignacion: string;
  valor: number;
  numero_referencia: string | null;
  observaciones: string | null;
  comprobante_mime: string;
  estado: SedeAbonoEstado;
  batch_id: number | null;
  codigo_lote: string | null;
  aplicado_at: string | null;
  aplicado_por_nombre: string | null;
  anulado_at: string | null;
  anulado_motivo: string | null;
  anulado_por_nombre: string | null;
  created_at: string;
  created_by: string;
  created_by_nombre: string | null;
}

export async function getMisSedeAbonos(): Promise<SedeAbonoRow[]> {
  const res = await postgrestFetch("/v_sede_abono?select=*&order=fecha_consignacion.desc,id.desc", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_sede_abono -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface SedeAbonoFilters {
  sede?: Sede;
  desde?: string;
  hasta?: string;
  estado?: SedeAbonoEstado;
}

export async function getAllSedeAbonos(filters: SedeAbonoFilters = {}): Promise<SedeAbonoRow[]> {
  const params = new URLSearchParams({ select: "*", order: "fecha_consignacion.desc,id.desc" });
  if (filters.sede) params.set("sede", `eq.${filters.sede}`);
  if (filters.estado) params.set("estado", `eq.${filters.estado}`);
  if (filters.desde) params.set("fecha_consignacion", `gte.${filters.desde}`);
  if (filters.hasta) params.append("fecha_consignacion", `lte.${filters.hasta}`);

  const res = await postgrestFetch(`/v_sede_abono?${params.toString()}`, {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_sede_abono -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getAvailableSedeAbonosForProvider(providerId: number): Promise<SedeAbonoRow[]> {
  const res = await postgrestFetch(
    `/v_sede_abono?provider_id=eq.${providerId}&estado=eq.disponible&select=*&order=fecha_consignacion.asc`,
    {},
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST /v_sede_abono -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getAppliedSedeAbonosForBatch(batchId: number): Promise<SedeAbonoRow[]> {
  const res = await postgrestFetch(`/v_sede_abono?batch_id=eq.${batchId}&select=*&order=fecha_consignacion.asc`, {}, "treasury");
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
