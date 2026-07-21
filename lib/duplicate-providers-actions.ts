"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

export async function mergeProviders(
  keeperId: number,
  duplicateId: number
): Promise<{ ok: boolean; error?: string; conflictos?: string[] }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/merge_duplicate_providers",
    { method: "POST", body: JSON.stringify({ p_keeper_id: keeperId, p_duplicate_id: duplicateId, p_user_id: userId }) },
    "providers"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string; conflictos?: string[] };
  if (result.error === "FORBIDDEN") return { ok: false, error: "No tienes permiso para fusionar proveedores." };
  if (result.error === "PROVIDER_ALREADY_INACTIVE") return { ok: false, error: "Uno de los dos proveedores ya está inactivo." };
  if (result.error) return { ok: false, error: result.error };

  revalidatePath("/conciliacion");
  revalidatePath("/proveedores");
  return { ok: true, conflictos: result.conflictos };
}

export async function dismissDuplicate(id1: number, id2: number, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/dismiss_duplicate_suggestion",
    { method: "POST", body: JSON.stringify({ p_id_1: id1, p_id_2: id2, p_user_id: userId, p_motivo: motivo || null }) },
    "providers"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string };
  if (result.error === "FORBIDDEN") return { ok: false, error: "No tienes permiso para hacer esto." };
  if (result.error) return { ok: false, error: result.error };

  revalidatePath("/conciliacion");
  return { ok: true };
}
