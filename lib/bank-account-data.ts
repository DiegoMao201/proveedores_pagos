import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface BankCatalogRow {
  codigo: number;
  nombre: string;
}

export async function getBankCatalog(): Promise<BankCatalogRow[]> {
  const res = await postgrestFetch("/bank_catalog?select=*&order=nombre.asc", {}, "providers");
  if (!res.ok) throw new Error(`PostgREST /bank_catalog -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface BankAccountRow {
  id: number;
  provider_id: number;
  medio_pago: "transferencia" | "portal_proveedor";
  tipo_documento_beneficiario: number;
  nit_beneficiario: string;
  nombre_beneficiario: string;
  tipo_transaccion: number | null;
  codigo_banco: number | null;
  numero_cuenta: string | null;
  tipo_cuenta: "S" | "D" | null;
  email_pago: string | null;
  referencia: string | null;
  celular_beneficiario: string | null;
  es_principal: boolean;
  inscrita_bancolombia: boolean;
  fecha_inscripcion: string | null;
  activa: boolean;
}

export async function getBankAccounts(providerId: number): Promise<BankAccountRow[]> {
  const res = await postgrestFetch(
    `/bank_account?provider_id=eq.${providerId}&activa=eq.true&select=*&order=es_principal.desc,id.asc`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /bank_account -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getPrincipalBankAccountsForProviders(providerIds: number[]): Promise<BankAccountRow[]> {
  if (providerIds.length === 0) return [];
  const res = await postgrestFetch(
    `/bank_account?provider_id=in.(${providerIds.join(",")})&activa=eq.true&es_principal=eq.true&select=*`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /bank_account -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface ProviderListRow {
  id: number;
  codigo_proveedor: string | null;
  nif: string | null;
  nombre: string;
  nombre_normalizado: string;
  activo: boolean;
  categoria_proveedor: string | null;
  email_pago: string | null;
  contacto_pagos: string | null;
  plazo_pago_dias: number | null;
  tiene_cuenta_activa: boolean;
  tiene_cuenta_inscrita: boolean;
}

export async function getProviderList(q?: string, categoria?: string, estadoBancario?: string): Promise<ProviderListRow[]> {
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "nombre.asc");
  if (q) {
    const cleaned = q.replace(/[,()]/g, "");
    params.set("or", `(nombre.ilike.*${cleaned}*,nif.ilike.*${cleaned}*,codigo_proveedor.ilike.*${cleaned}*)`);
  }
  if (categoria) params.set("categoria_proveedor", `eq.${categoria}`);
  if (estadoBancario === "pagable") params.set("tiene_cuenta_activa", "eq.true");
  if (estadoBancario === "sin_cuenta") params.set("tiene_cuenta_activa", "eq.false");
  if (estadoBancario === "inactivo") params.set("activo", "eq.false");

  const res = await postgrestFetch(`/v_provider_list?${params.toString()}`, {}, "providers");
  if (!res.ok) throw new Error(`PostgREST /v_provider_list -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface UnknownProviderRow {
  nombre_proveedor_erp: string;
  nombre_normalizado_erp: string;
  docs_en_cartera: number;
  facturas: number;
  ncs: number;
  pendiente_total: number;
  primera_fecha: string | null;
  ultima_fecha: string | null;
  ultima_sync: string | null;
}

export async function getUnknownProviders(): Promise<UnknownProviderRow[]> {
  const res = await postgrestFetch("/v_unknown_providers_in_cartera?select=*", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_unknown_providers_in_cartera -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}
