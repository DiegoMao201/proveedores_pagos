"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

function normalizeProviderName(nombre: string): string {
  return nombre
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

async function patchProvider(id: number, body: Record<string, unknown>) {
  const userId = await currentUserId();
  const res = await postgrestFetch(
    `/provider?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify({ ...body, updated_by: userId }) },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST PATCH /provider -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${id}`);
}

export async function updateProviderBasics(
  id: number,
  data: { nombre: string; nif: string | null; categoria_proveedor: string | null; observaciones: string | null; activo: boolean }
) {
  await patchProvider(id, data);
}

export async function updateProviderConditions(
  id: number,
  data: {
    plazo_pago_dias: number | null;
    forma_pago: string | null;
    limite_credito: number | null;
    dia_corte_pagos: number | null;
    anomaly_detection: boolean;
  }
) {
  await patchProvider(id, data);
}

export async function updateProviderContacts(
  id: number,
  data: { email_pago: string | null; contacto_pagos: string | null; contacto_cargo: string | null; telefono: string | null }
) {
  await patchProvider(id, data);
}

export async function createProvider(data: {
  nombre: string;
  nif: string | null;
  categoria_proveedor: string | null;
  plazo_pago_dias: number | null;
  forma_pago: string | null;
  email_pago: string | null;
  telefono: string | null;
  contacto_pagos: string | null;
}): Promise<{ id: number }> {
  const userId = await currentUserId();
  const nombreNormalizado = normalizeProviderName(data.nombre);

  const res = await postgrestFetch(
    "/provider",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...data, nombre_normalizado: nombreNormalizado, activo: true, created_by: userId, updated_by: userId }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST POST /provider -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as { id: number }[];
  revalidatePath("/proveedores");
  return rows[0];
}

export async function quickOnboardProvider(data: {
  nombreErp: string;
  nombre: string;
  categoria_proveedor: string;
  nif: string | null;
  es_autoretenedor: boolean;
}): Promise<{ id: number }> {
  const userId = await currentUserId();
  const nombreNormalizado = normalizeProviderName(data.nombre);

  const res = await postgrestFetch(
    "/provider",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        nombre: data.nombre,
        nombre_normalizado: nombreNormalizado,
        categoria_proveedor: data.categoria_proveedor,
        nif: data.nif,
        es_autoretenedor: data.es_autoretenedor,
        activo: true,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST POST /provider -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as { id: number }[];
  const providerId = rows[0].id;

  const aliasNorm = normalizeProviderName(data.nombreErp);
  if (aliasNorm && aliasNorm !== nombreNormalizado) {
    const aliasRes = await postgrestFetch(
      "/provider_alias",
      {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify({ provider_id: providerId, alias: data.nombreErp, alias_norm: aliasNorm, created_by: userId }),
      },
      "providers"
    );
    if (!aliasRes.ok) throw new Error(`PostgREST POST /provider_alias -> HTTP ${aliasRes.status}: ${await aliasRes.text()}`);
  }

  revalidatePath("/proveedores");
  revalidatePath("/");
  return { id: providerId };
}

export interface ProviderImportRow {
  rowNumber: number;
  nombre: string;
  nif: string | null;
  categoria_proveedor: string | null;
  activo: boolean;
  plazo_pago_dias: number | null;
  forma_pago: string | null;
  limite_credito: number | null;
  dia_corte_pagos: number | null;
  anomaly_detection: boolean;
  email_pago: string | null;
  telefono: string | null;
  contacto_pagos: string | null;
  contacto_cargo: string | null;
  observaciones: string | null;
  accion: "crear" | "actualizar";
  proveedor_id: number | null;
}

export async function bulkImportProviders(
  rows: ProviderImportRow[]
): Promise<{ creados: number; actualizados: number; errores: { rowNumber: number; mensaje: string }[] }> {
  const userId = await currentUserId();
  let creados = 0;
  let actualizados = 0;
  const errores: { rowNumber: number; mensaje: string }[] = [];

  for (const row of rows) {
    const body = {
      nombre: row.nombre,
      nif: row.nif,
      categoria_proveedor: row.categoria_proveedor,
      activo: row.activo,
      plazo_pago_dias: row.plazo_pago_dias,
      forma_pago: row.forma_pago,
      limite_credito: row.limite_credito,
      dia_corte_pagos: row.dia_corte_pagos,
      anomaly_detection: row.anomaly_detection,
      email_pago: row.email_pago,
      telefono: row.telefono,
      contacto_pagos: row.contacto_pagos,
      contacto_cargo: row.contacto_cargo,
      observaciones: row.observaciones,
      updated_by: userId,
    };
    try {
      if (row.accion === "actualizar" && row.proveedor_id) {
        const res = await postgrestFetch(`/provider?id=eq.${row.proveedor_id}`, { method: "PATCH", body: JSON.stringify(body) }, "providers");
        if (!res.ok) throw new Error(await res.text());
        actualizados++;
      } else {
        const res = await postgrestFetch(
          "/provider",
          { method: "POST", body: JSON.stringify({ ...body, nombre_normalizado: normalizeProviderName(row.nombre), created_by: userId }) },
          "providers"
        );
        if (!res.ok) throw new Error(await res.text());
        creados++;
      }
    } catch (e) {
      errores.push({ rowNumber: row.rowNumber, mensaje: e instanceof Error ? e.message : "Error desconocido" });
    }
  }

  revalidatePath("/proveedores");
  return { creados, actualizados, errores };
}

export type MedioPago = "transferencia" | "portal_proveedor";

export interface BankAccountInput {
  medio_pago: MedioPago;
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
}

export async function createBankAccount(providerId: number, data: BankAccountInput) {
  const userId = await currentUserId();
  const esPortal = data.medio_pago === "portal_proveedor";

  let inscrita = false;
  if (!esPortal) {
    const checkRes = await postgrestFetch(
      `/rpc/check_bancolombia_inscription`,
      { method: "POST", body: JSON.stringify({ p_numero_cuenta: data.numero_cuenta, p_codigo_banco: data.codigo_banco }) },
      "providers"
    );
    const check = checkRes.ok ? ((await checkRes.json()) as { inscrita: boolean }) : { inscrita: false };
    inscrita = check.inscrita;
  }

  const existingRes = await postgrestFetch(`/bank_account?provider_id=eq.${providerId}&select=id&limit=1`, {}, "providers");
  const existing = existingRes.ok ? ((await existingRes.json()) as unknown[]) : [];

  const res = await postgrestFetch(
    "/bank_account",
    {
      method: "POST",
      body: JSON.stringify({
        ...data,
        provider_id: providerId,
        es_principal: existing.length === 0,
        inscrita_bancolombia: inscrita,
        fecha_inscripcion: inscrita ? new Date().toISOString().slice(0, 10) : null,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST POST /bank_account -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  return { inscrita };
}

export async function deactivateBankAccount(id: number, providerId: number) {
  const userId = await currentUserId();
  const res = await postgrestFetch(
    `/bank_account?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify({ activa: false, updated_by: userId }) },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST PATCH /bank_account -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
}

export async function setBankAccountPrincipal(id: number, providerId: number) {
  const res = await postgrestFetch(
    `/rpc/set_bank_account_as_principal`,
    { method: "POST", body: JSON.stringify({ p_bank_account_id: id }) },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST RPC set_bank_account_as_principal -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
}

export interface BancolombiaImportRow {
  numero_cuenta: string;
  tipo_cuenta_bancolombia: number;
  nombre_personalizado: string;
  banco_codigo: number;
  numero_documento_tercero: string;
  tipo_documento_tercero: number;
  validacion_titularidad: string | null;
  tope_pago_dia: number | null;
}

export async function importBancolombiaAccounts(rows: BancolombiaImportRow[]): Promise<{ imported: number; total: number }> {
  const res = await postgrestFetch(
    "/bancolombia_registered_account",
    { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(rows) },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST POST /bancolombia_registered_account -> HTTP ${res.status}: ${await res.text()}`);

  const totalRes = await postgrestFetch(`/bancolombia_registered_account?select=id`, { headers: { Prefer: "count=exact" } }, "providers");
  const contentRange = totalRes.headers.get("Content-Range");
  const total = contentRange ? Number(contentRange.split("/")[1]) : rows.length;

  revalidatePath("/proveedores");
  return { imported: rows.length, total };
}

export interface ProviderContactInput {
  nombre: string | null;
  email: string;
  notas: string | null;
}

export async function addProviderContact(providerId: number, data: ProviderContactInput) {
  const userId = await currentUserId();
  const res = await postgrestFetch(
    "/provider_contact",
    {
      method: "POST",
      body: JSON.stringify({
        provider_id: providerId,
        ...data,
        activo: true,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST POST /provider_contact -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
}

export async function deactivateProviderContact(id: number, providerId: number) {
  const userId = await currentUserId();
  const res = await postgrestFetch(
    `/provider_contact?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify({ activo: false, updated_by: userId }) },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST PATCH /provider_contact -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
}
