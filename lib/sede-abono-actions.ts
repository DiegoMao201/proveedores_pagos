"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import { getPintucoProviderId } from "@/lib/sede-abono-data";

async function currentUser() {
  const session = await auth();
  if (!session?.user.id) return null;
  return session.user;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function reportarSedeAbono(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "NO_SESSION" };
  if (user.role !== "sede" || !user.sede) return { ok: false, error: "Solo un usuario de sede puede reportar abonos." };

  const fecha = formData.get("fecha_consignacion");
  const valorRaw = formData.get("valor");
  const numeroReferencia = formData.get("numero_referencia");
  const observaciones = formData.get("observaciones");
  const comprobante = formData.get("comprobante");

  if (typeof fecha !== "string" || !fecha) return { ok: false, error: "Falta la fecha de la consignación." };
  const valor = Number(valorRaw);
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, error: "El valor debe ser mayor a cero." };
  if (!(comprobante instanceof File) || comprobante.size === 0) return { ok: false, error: "Adjunta la foto o PDF del comprobante." };
  if (comprobante.size > MAX_FILE_BYTES) return { ok: false, error: "El comprobante no puede pesar más de 5 MB." };
  if (!ALLOWED_MIME.has(comprobante.type)) return { ok: false, error: "El comprobante debe ser una imagen (JPG/PNG/WEBP) o un PDF." };

  const providerId = await getPintucoProviderId();
  const bytes = await comprobante.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const res = await postgrestFetch(
    "/sede_abono",
    {
      method: "POST",
      body: JSON.stringify({
        provider_id: providerId,
        sede: user.sede,
        fecha_consignacion: fecha,
        valor,
        numero_referencia: typeof numeroReferencia === "string" && numeroReferencia.trim() ? numeroReferencia.trim() : null,
        observaciones: typeof observaciones === "string" && observaciones.trim() ? observaciones.trim() : null,
        comprobante_contenido: base64,
        comprobante_mime: comprobante.type,
        created_by: user.id,
      }),
    },
    "treasury"
  );

  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  revalidatePath("/abonos");
  revalidatePath("/abonos-sedes");
  return { ok: true };
}

export async function applySedeAbonosToBatch(batchId: number, abonoIds: number[], codigoLote: string): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "NO_SESSION" };
  if (abonoIds.length === 0) return { ok: false, error: "Selecciona al menos un abono." };

  const res = await postgrestFetch(
    "/rpc/apply_sede_abonos_to_batch",
    { method: "POST", body: JSON.stringify({ p_batch_id: batchId, p_abono_ids: abonoIds, p_user_id: user.id }) },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string };
  if (result.error === "BATCH_NOT_EDITABLE") return { ok: false, error: "Este lote ya no se puede editar." };
  if (result.error === "ABONOS_REQUIERE_LOTE_UN_SOLO_PROVEEDOR") return { ok: false, error: "Los abonos solo se pueden aplicar a lotes de un solo proveedor." };
  if (result.error === "ABONO_NOT_AVAILABLE") return { ok: false, error: "Alguno de estos abonos ya no está disponible." };
  if (result.error === "ABONOS_EXCEDEN_VALOR_NETO") return { ok: false, error: "La suma de abonos supera el valor neto del lote." };
  if (result.error) return { ok: false, error: result.error };

  revalidatePath(`/lotes/${codigoLote}`);
  revalidatePath("/abonos-sedes");
  return { ok: true };
}

export async function unapplySedeAbono(abonoId: number, codigoLote: string): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/unapply_sede_abono",
    { method: "POST", body: JSON.stringify({ p_abono_id: abonoId, p_user_id: user.id }) },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string };
  if (result.error === "ABONO_NOT_APPLIED") return { ok: false, error: "Este abono ya no está aplicado a ningún lote." };
  if (result.error === "BATCH_NOT_EDITABLE") return { ok: false, error: "Este lote ya no se puede editar." };
  if (result.error) return { ok: false, error: result.error };

  revalidatePath(`/lotes/${codigoLote}`);
  revalidatePath("/abonos-sedes");
  return { ok: true };
}

export async function anularSedeAbono(abonoId: number, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "NO_SESSION" };
  if (motivo.trim().length < 5) return { ok: false, error: "El motivo debe tener al menos 5 caracteres." };

  const res = await postgrestFetch(
    "/rpc/anular_sede_abono",
    { method: "POST", body: JSON.stringify({ p_abono_id: abonoId, p_user_id: user.id, p_motivo: motivo }) },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string };
  if (result.error === "ABONO_NOT_CANCELABLE") return { ok: false, error: "Solo se pueden anular abonos disponibles (no aplicados)." };
  if (result.error === "MOTIVO_REQUERIDO") return { ok: false, error: "Escribe el motivo de la anulación." };
  if (result.error) return { ok: false, error: result.error };

  revalidatePath("/abonos-sedes");
  return { ok: true };
}
