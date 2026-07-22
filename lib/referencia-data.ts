import "server-only";
import { postgrestAnonFetch } from "@/lib/postgrest-anon";

export interface ReferenciaFacturadaRow {
  referencia: string;
  descripcion: string | null;
  cantidad: number | null;
  unidad_medida: string | null;
  valor_linea: number;
  invoice_key: string;
  num_factura: string;
  proveedor_correo: string;
  fecha_emision_correo: string | null;
  fecha_recepcion_correo: string | null;
  proveedor_id: number;
  categoria_proveedor: string;
}

/** Consulta si una referencia de producto aparece facturada en los ultimos 5
 * dias (regla de negocio aplicada en la vista treasury.v_referencia_facturada_reciente,
 * no aqui) para proveedores estrategicos.
 *
 * Pagina de consulta libre (Diego, 22 jul 2026): sin login, para compartir con
 * cualquier colaborador de bodega/compras -- por eso usa postgrestAnonFetch
 * (rol web_anon) en vez de postgrestFetch. web_anon SOLO tiene SELECT sobre
 * esta vista puntual (ver migracion 139), nada mas del resto de la app queda
 * expuesto por esta via. */
export async function buscarReferenciaFacturada(referencia: string): Promise<ReferenciaFacturadaRow[]> {
  const ref = referencia.trim();
  if (!ref) return [];
  const res = await postgrestAnonFetch(
    `/v_referencia_facturada_reciente?referencia=ilike.${encodeURIComponent(ref)}&order=fecha_emision_correo.desc`,
    {},
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST /v_referencia_facturada_reciente -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}
