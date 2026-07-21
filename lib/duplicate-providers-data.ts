import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface PosibleDuplicadoRow {
  proveedor_id_1: number;
  nombre_1: string;
  categoria_1: string | null;
  nif_1: string | null;
  proveedor_id_2: number;
  nombre_2: string;
  categoria_2: string | null;
  nif_2: string | null;
  similitud: number;
  mismo_nif: boolean;
  facturas_1: number;
  facturas_2: number;
  tiene_cuenta_1: boolean;
  tiene_cuenta_2: boolean;
}

export async function getPosiblesDuplicados(): Promise<PosibleDuplicadoRow[]> {
  const res = await postgrestFetch("/v_posibles_proveedores_duplicados?select=*", {}, "providers");
  if (!res.ok) throw new Error(`PostgREST /v_posibles_proveedores_duplicados -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}
