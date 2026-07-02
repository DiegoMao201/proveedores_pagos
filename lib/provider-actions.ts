"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
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
  const nombreNormalizado = data.nombre
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");

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

export interface BankAccountInput {
  tipo_documento_beneficiario: number;
  nit_beneficiario: string;
  nombre_beneficiario: string;
  tipo_transaccion: number;
  codigo_banco: number;
  numero_cuenta: string;
  tipo_cuenta: "S" | "D";
  email_pago: string | null;
  referencia: string | null;
  celular_beneficiario: string | null;
}

export async function createBankAccount(providerId: number, data: BankAccountInput) {
  const userId = await currentUserId();

  const checkRes = await postgrestFetch(
    `/rpc/check_bancolombia_inscription`,
    { method: "POST", body: JSON.stringify({ p_numero_cuenta: data.numero_cuenta, p_codigo_banco: data.codigo_banco }) },
    "providers"
  );
  const check = checkRes.ok ? ((await checkRes.json()) as { inscrita: boolean }) : { inscrita: false };

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
        inscrita_bancolombia: check.inscrita,
        fecha_inscripcion: check.inscrita ? new Date().toISOString().slice(0, 10) : null,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST POST /bank_account -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  return { inscrita: check.inscrita };
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
