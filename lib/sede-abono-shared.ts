// Tipos y constantes puras (sin "server-only"/postgrestFetch) para que los
// puedan importar tanto Server Components/Actions (via sede-abono-data.ts)
// como Client Components (formularios, tablas) sin arrastrar el módulo
// entero de acceso a datos al bundle del navegador.

export type Sede = "Manizales" | "Armenia" | "Pereira";
export type SedeAbonoEstado = "disponible" | "aplicado" | "anulado";
export type SedeAbonoTipoOrigen = "planilla" | "recibo_caja";

export const TIPO_ORIGEN_LABELS: Record<SedeAbonoTipoOrigen, string> = {
  planilla: "Planilla (cierre de caja)",
  recibo_caja: "Recibos de caja (abonos a cartera)",
};

export interface SedeAbonoRow {
  id: number;
  provider_id: number;
  proveedor_nombre: string | null;
  sede: Sede;
  tipo_origen: SedeAbonoTipoOrigen;
  periodo_desde: string;
  periodo_hasta: string;
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
