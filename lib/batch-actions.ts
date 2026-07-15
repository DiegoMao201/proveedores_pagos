"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import { getProviderInvoicesWithCalc, type ProviderInvoiceCalc } from "@/lib/batch-data";
import { getMesaInvoices, type MesaInvoiceRow } from "@/lib/mesa-data";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

export async function recalculateInvoices(providerId: number, fechaPago: string): Promise<ProviderInvoiceCalc[]> {
  return getProviderInvoicesWithCalc(providerId, fechaPago);
}

export async function recalculateMesaInvoices(fechaPago: string): Promise<MesaInvoiceRow[]> {
  return getMesaInvoices(fechaPago);
}

export async function createBatch(input: {
  providerId: number | null;
  invoiceKeys: string[];
  ownAccountId: number;
  destAccountId: number | null;
  fechaPago: string;
  descripcion: string;
  esMultiproveedor?: boolean;
}): Promise<{ ok: boolean; batchId?: number; codigoLote?: string; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  // Mesa de Pagos (ConsolidarLoteModal) siempre manda destAccountId: null,
  // asumiendo que el lote va a ser multi-proveedor (donde NULL es correcto,
  // create_payment_batch resuelve la cuenta de cada proveedor mas tarde vía
  // v_batch_provider_breakdown). Si terminas seleccionando facturas de UN
  // SOLO proveedor, esMultiproveedor sale false y create_payment_batch
  // necesita una cuenta destino real -- sin esto, "id = NULL" nunca
  // matchea nada en providers.bank_account y siempre da
  // DESTINATION_ACCOUNT_NOT_FOUND. Solo se resuelve aqui cuando el cliente
  // no mando ya una cuenta explicita (el modal de un solo proveedor desde
  // /proveedores/[id] SI la manda, y esa sigue intacta).
  let destAccountId = input.destAccountId;
  if (!input.esMultiproveedor && !destAccountId && input.providerId) {
    const destRes = await postgrestFetch(
      `/bank_account?provider_id=eq.${input.providerId}&activa=eq.true&es_principal=eq.true&select=id&limit=1`,
      {},
      "providers"
    );
    if (destRes.ok) {
      const destRows = (await destRes.json()) as { id: number }[];
      destAccountId = destRows[0]?.id ?? null;
    }
  }

  const res = await postgrestFetch(
    "/rpc/create_payment_batch",
    {
      method: "POST",
      body: JSON.stringify({
        p_provider_id: input.providerId,
        p_invoice_keys: input.invoiceKeys,
        p_own_account_id: input.ownAccountId,
        p_dest_account_id: destAccountId,
        p_fecha_pago: input.fechaPago,
        p_descripcion: input.descripcion,
        p_user_id: userId,
        p_es_multiproveedor: input.esMultiproveedor ?? false,
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
    proveedores?: string[];
  };
  if (result.error === "INVOICE_ALREADY_IN_ACTIVE_BATCH") {
    const facturas = (result.invoice_keys ?? []).map((k) => k.split("|")[1] ?? k).join(", ");
    return { ok: false, error: `Estas facturas ya están en otro lote activo: ${facturas}` };
  }
  if (result.error === "PROVIDERS_WITHOUT_REGISTERED_ACCOUNT") {
    return { ok: false, error: `Estos proveedores no tienen cuenta principal inscrita en Bancolombia: ${(result.proveedores ?? []).join(", ")}` };
  }
  if (result.error === "INCONSISTENT_MULTI_FLAG") {
    return { ok: false, error: "Seleccionaste facturas de un solo proveedor pero marcaste el lote como multi-proveedor." };
  }
  if (result.error === "DESTINATION_ACCOUNT_NOT_FOUND") {
    return { ok: false, error: "Este proveedor no tiene una cuenta bancaria principal activa registrada." };
  }
  if (result.error) return { ok: false, error: result.error };

  if (input.providerId) revalidatePath(`/proveedores/${input.providerId}`);
  revalidatePath("/mesa-de-pagos");
  revalidatePath("/lotes");
  return { ok: true, batchId: result.batch_id, codigoLote: result.codigo_lote };
}
