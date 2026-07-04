"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

interface RpcResult {
  error?: string;
  accion?: string;
  exclusion_id?: string;
  invoice_key?: string;
}

interface RpcBatchResult {
  error?: string;
  total?: number;
  exitosas?: number;
  con_error?: number;
}

function friendlyError(code: string | undefined): string {
  switch (code) {
    case "EXCLUSION_MOTIVE_TOO_SHORT":
      return "El motivo debe tener al menos 10 caracteres.";
    case "INVOICE_NOT_FOUND":
      return "No se encontró la factura.";
    case "FORBIDDEN":
      return "No tienes permiso para excluir facturas.";
    case "EXCLUSION_NOT_FOUND_OR_ALREADY_INACTIVE":
      return "Esta factura ya no está excluida.";
    case "EMPTY_INVOICE_KEYS":
      return "Debes seleccionar al menos una factura.";
    default:
      return code ?? "Ocurrió un error inesperado.";
  }
}

export async function excludeInvoice(
  invoiceKey: string,
  motivo: string,
  source: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "No hay sesión activa." };

  const res = await postgrestFetch(
    "/rpc/exclude_invoice",
    {
      method: "POST",
      body: JSON.stringify({ p_invoice_key: invoiceKey, p_motivo: motivo, p_user_id: userId, p_source: source }),
    },
    "audit"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as RpcResult;
  if (result.error) return { ok: false, error: friendlyError(result.error) };

  revalidatePath("/conciliacion");
  revalidatePath("/proveedores/[id]", "page");
  return { ok: true };
}

export async function excludeInvoicesBatch(
  invoiceKeys: string[],
  motivo: string,
  source: string
): Promise<{ ok: boolean; error?: string; exitosas?: number }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "No hay sesión activa." };

  const res = await postgrestFetch(
    "/rpc/exclude_invoices_batch",
    {
      method: "POST",
      body: JSON.stringify({ p_invoice_keys: invoiceKeys, p_motivo: motivo, p_user_id: userId, p_source: source }),
    },
    "audit"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as RpcBatchResult;
  if (result.error) return { ok: false, error: friendlyError(result.error) };

  revalidatePath("/conciliacion");
  revalidatePath("/proveedores/[id]", "page");
  return { ok: true, exitosas: result.exitosas };
}

export async function reactivateInvoiceExclusion(
  invoiceKey: string,
  motivoReactivacion: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "No hay sesión activa." };

  const res = await postgrestFetch(
    "/rpc/reactivate_invoice_exclusion",
    {
      method: "POST",
      body: JSON.stringify({
        p_invoice_key: invoiceKey,
        p_motivo_reactivacion: motivoReactivacion || null,
        p_user_id: userId,
      }),
    },
    "audit"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as RpcResult;
  if (result.error) return { ok: false, error: friendlyError(result.error) };

  revalidatePath("/conciliacion");
  revalidatePath("/proveedores/[id]", "page");
  return { ok: true };
}
