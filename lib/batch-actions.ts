"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import { getProviderInvoicesWithCalc, type ProviderInvoiceCalc } from "@/lib/batch-data";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

export async function recalculateInvoices(providerId: number, fechaPago: string): Promise<ProviderInvoiceCalc[]> {
  return getProviderInvoicesWithCalc(providerId, fechaPago);
}

export async function createBatch(input: {
  providerId: number;
  invoiceKeys: string[];
  ownAccountId: number;
  destAccountId: number;
  fechaPago: string;
  descripcion: string;
}): Promise<{ ok: boolean; batchId?: number; codigoLote?: string; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/create_payment_batch",
    {
      method: "POST",
      body: JSON.stringify({
        p_provider_id: input.providerId,
        p_invoice_keys: input.invoiceKeys,
        p_own_account_id: input.ownAccountId,
        p_dest_account_id: input.destAccountId,
        p_fecha_pago: input.fechaPago,
        p_descripcion: input.descripcion,
        p_user_id: userId,
      }),
    },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as {
    ok?: boolean;
    error?: string;
    batch_id?: number;
    codigo_lote?: string;
    invoice_keys?: string[];
  };
  if (result.error === "INVOICE_ALREADY_IN_ACTIVE_BATCH") {
    const facturas = (result.invoice_keys ?? []).map((k) => k.split("|")[1] ?? k).join(", ");
    return { ok: false, error: `Estas facturas ya están en otro lote activo: ${facturas}` };
  }
  if (result.error) return { ok: false, error: result.error };

  revalidatePath(`/proveedores/${input.providerId}`);
  revalidatePath("/lotes");
  return { ok: true, batchId: result.batch_id, codigoLote: result.codigo_lote };
}
