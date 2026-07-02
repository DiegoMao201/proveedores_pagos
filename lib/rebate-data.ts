import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

async function fetchAll<T>(path: string): Promise<T[]> {
  const res = await postgrestFetch(path, {}, "rebate");
  if (!res.ok) throw new Error(`PostgREST ${path} -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchOne<T>(path: string): Promise<T | null> {
  const rows = await fetchAll<T>(path);
  return rows[0] ?? null;
}

export interface PintucoMonthlyRow {
  mes: string;
  mes_num: number;
  trimestre: string;
  escala_1: number;
  escala_2: number;
  corte_estacionalidad: string;
  venta_lograda: number;
  valor_pendiente: number;
  cartera_riesgo: boolean;
  pct_a_escala_1: number | null;
  pct_a_escala_2: number | null;
  escala_lograda: "SIN_ESCALA" | "ESCALA_1" | "ESCALA_2";
  tasa_mensual_ganada: number;
  rebate_mensual_ganado: number;
  gap_siguiente_escalon: number;
}

export interface PintucoQuarterlyRow {
  trimestre: string;
  meta_trimestre_e1: number;
  meta_trimestre_e2: number;
  venta_lograda_trimestre: number;
  pct_a_e2_trimestre: number | null;
  escala_lograda_trimestre: "SIN_ESCALA" | "ESCALA_1" | "ESCALA_2";
  rebate_trimestral_ganado: number;
  recomposicion_trimestral_recuperable: number;
  recomposicion_trimestral_bloqueada: number;
}

export interface PintucoSeasonalityRow {
  mes_num: number;
  mes: string;
  corte_estacionalidad: string;
  venta_pre_corte: number;
  escala_2: number;
  pct_pre_corte: number | null;
  bono_aplica: boolean;
  bono_valor: number;
}

export interface PintucoRecompositionRow {
  compra_aplicable_acumulada: number;
  meta_acumulada_e1: number;
  meta_acumulada_e2: number;
  meta_ciclo_e1: number;
  meta_ciclo_e2: number;
  pct_acumulado_e1: number | null;
  pct_acumulado_e2: number | null;
  escala_ciclo: "SIN_ESCALA" | "ESCALA_1" | "ESCALA_2";
  recomposicion_9m_proyectada: number;
  recomposicion_9m_bloqueada: number;
  dias_restantes_ciclo: number;
  ritmo_diario_actual: number | null;
  ritmo_diario_requerido: number | null;
}

export async function getPintucoMonthly() {
  return fetchAll<PintucoMonthlyRow>("/v_pintuco_monthly?select=*&order=mes_num");
}

export async function getPintucoQuarterly() {
  return fetchAll<PintucoQuarterlyRow>("/v_pintuco_quarterly?select=*&order=trimestre");
}

export async function getPintucoSeasonality() {
  return fetchAll<PintucoSeasonalityRow>("/v_pintuco_seasonality?select=*&order=mes_num");
}

export async function getPintucoRecomposition() {
  return fetchOne<PintucoRecompositionRow>("/v_pintuco_recomposition?select=*");
}

export interface AbracolBimesterRow {
  periodo: string;
  inicio: string;
  fin: string;
  ventas_2025: number;
  meta_2026: number;
  venta_lograda: number;
  valor_pendiente: number;
  cartera_riesgo: boolean;
  pct_cumplimiento: number | null;
  pct_crecimiento_vs_2025: number | null;
  faltante_meta: number;
  rebate_presupuestado: number;
  rebate_actual: number;
  iva_actual: number;
  total_actual: number;
  rebate_bloqueado: number;
  estado_periodo: "FUTURO" | "CUMPLIDO" | "ABIERTO" | "NO_CUMPLIDO";
}

export async function getAbracolBimester() {
  return fetchAll<AbracolBimesterRow>("/v_abracol_bimester?select=*&order=inicio");
}

export interface GoyaSemesterRow {
  periodo: string;
  inicio: string;
  fin: string;
  ventas_2024: number;
  base_2025: number;
  meta_20: number;
  meta_30: number;
  meta_40: number;
  meta_50: number;
  venta_lograda: number;
  pct_crecimiento: number | null;
  escala_lograda: "SIN_ESCALA" | "ESCALA_20" | "ESCALA_30" | "ESCALA_40" | "ESCALA_50";
  tasa_rebate: number;
  rebate_pre_gate: number;
  cartera_vencida: boolean;
  valor_cartera_vencida: number;
  rebate_ganado: number;
  valor_pendiente: number;
  rebate_bloqueado: number;
  siguiente_meta: string;
  faltante_siguiente_meta: number;
  estado_periodo: "FUTURO" | "CUMPLIDO" | "ABIERTO" | "NO_CUMPLIDO";
}

export async function getGoyaSemester() {
  return fetchAll<GoyaSemesterRow>("/v_goya_semester?select=*&order=inicio");
}

export interface RebateSummary {
  provider: "pintuco" | "abracol" | "goya";
  label: string;
  cycle: string;
  href: string;
  currentPeriodLabel: string;
  currentPeriodPct: number | null;
  gananciaAcumulada: number;
  estado: string;
}

function currentRow<T extends { estado_periodo: string }>(rows: T[]): T | undefined {
  return rows.find((r) => r.estado_periodo === "ABIERTO") ?? rows[rows.length - 1];
}

export async function getRebateDashboardSummary(): Promise<RebateSummary[]> {
  const [monthly, abracol, goya] = await Promise.all([getPintucoMonthly(), getAbracolBimester(), getGoyaSemester()]);

  const pintucoCurrent = currentRow(
    monthly.map((m) => ({ ...m, estado_periodo: m.cartera_riesgo ? "ABIERTO" : m.escala_lograda === "SIN_ESCALA" ? "ABIERTO" : "CUMPLIDO" }))
  );
  const pintucoGanado = monthly.reduce((acc, m) => acc + m.rebate_mensual_ganado, 0);

  const abracolCurrent = currentRow(abracol);
  const abracolGanado = abracol.reduce((acc, b) => acc + b.rebate_actual, 0);

  const goyaCurrent = currentRow(goya);
  const goyaGanado = goya.reduce((acc, g) => acc + g.rebate_ganado, 0);

  return [
    {
      provider: "pintuco",
      label: "Pintuco",
      cycle: "Trimestral",
      href: "/rebate/pintuco",
      currentPeriodLabel: pintucoCurrent?.mes ?? "—",
      currentPeriodPct: pintucoCurrent?.pct_a_escala_2 ?? null,
      gananciaAcumulada: pintucoGanado,
      estado: pintucoCurrent?.escala_lograda ?? "SIN_ESCALA",
    },
    {
      provider: "abracol",
      label: "Abracol",
      cycle: "Bimestral",
      href: "/rebate/abracol",
      currentPeriodLabel: abracolCurrent?.periodo ?? "—",
      currentPeriodPct: abracolCurrent?.pct_cumplimiento ?? null,
      gananciaAcumulada: abracolGanado,
      estado: abracolCurrent?.estado_periodo ?? "ABIERTO",
    },
    {
      provider: "goya",
      label: "Goya",
      cycle: "Semestral",
      href: "/rebate/goya",
      currentPeriodLabel: goyaCurrent?.periodo ?? "—",
      currentPeriodPct: goyaCurrent?.pct_crecimiento ?? null,
      gananciaAcumulada: goyaGanado,
      estado: goyaCurrent?.escala_lograda ?? "SIN_ESCALA",
    },
  ];
}
