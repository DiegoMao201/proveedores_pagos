"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

interface RpcResult {
  ok?: boolean;
  error?: string;
}

function friendlyError(code: string | undefined): string {
  switch (code) {
    case "MOTIVO_MUY_CORTO":
      return "El motivo debe tener al menos 10 caracteres.";
    case "INVOICE_NOT_FOUND":
      return "No se encontró la factura en el ERP.";
    case "ALREADY_RELEASED":
      return "Esta factura ya estaba habilitada para pago.";
    case "FORBIDDEN":
      return "No tienes permiso para habilitar facturas para pago.";
    default:
      return code ?? "Ocurrió un error inesperado.";
  }
}

export async function releaseInvoiceForPayment(invoiceKey: string, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "No hay sesión activa." };

  const res = await postgrestFetch(
    "/rpc/release_invoice_for_payment",
    { method: "POST", body: JSON.stringify({ p_invoice_key: invoiceKey, p_motivo: motivo, p_user_id: userId }) },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as RpcResult;
  if (result.error) return { ok: false, error: friendlyError(result.error) };

  revalidatePath("/conciliacion");
  revalidatePath("/mesa-de-pagos");
  return { ok: true };
}
