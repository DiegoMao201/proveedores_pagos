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

  const tipoOrigen = formData.get("tipo_origen");
  const periodoDesde = formData.get("periodo_desde");
  const periodoHasta = formData.get("periodo_hasta");
  const valorRaw = formData.get("valor");
  const numeroReferencia = formData.get("numero_referencia");
  const observaciones = formData.get("observaciones");
  const comprobante = formData.get("comprobante");

  if (tipoOrigen !== "planilla" && tipoOrigen !== "recibo_caja") return { ok: false, error: "Selecciona si es planilla o recibos de caja." };
  if (typeof periodoDesde !== "string" || !periodoDesde) return { ok: false, error: "Falta la fecha inicial del período." };
  if (typeof periodoHasta !== "string" || !periodoHasta) return { ok: false, error: "Falta la fecha final del período." };
  if (periodoHasta < periodoDesde) return { ok: false, error: "La fecha final del período no puede ser anterior a la inicial." };
  const valor = Number(valorRaw);
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, error: "El valor debe ser mayor a cero." };
  if (!(comprobante instanceof File) || comprobante.size === 0) return { ok: false, error: "Adjunta la foto o PDF del comprobante." };
  if (comprobante.size > MAX_FILE_BYTES) return { ok: false, error: "El comprobante no puede pesar más de 5 MB." };
  if (!ALLOWED_MIME.has(comprobante.type)) return { ok: false, error: "El comprobante debe ser una imagen (JPG/PNG/WEBP) o un PDF." };

  const providerId = await getPintucoProviderId();
  const bytes = await comprobante.arrayBuffer();
  // PostgREST expone/espera bytea en el formato hex de Postgres ("\x..."),
  // NO base64 -- confirmado con una prueba real contra el PostgREST de
  // producción: un valor base64 se guarda tal cual como bytes literales del
  // string (corrompiendo el archivo), mientras que "\x" + hex hace un
  // roundtrip exacto.
  const hex = `\\x${Buffer.from(bytes).toString("hex")}`;

  const res = await postgrestFetch(
    "/sede_abono",
    {
      method: "POST",
      body: JSON.stringify({
        provider_id: providerId,
        sede: user.sede,
        tipo_origen: tipoOrigen,
        periodo_desde: periodoDesde,
        periodo_hasta: periodoHasta,
        valor,
        numero_referencia: typeof numeroReferencia === "string" && numeroReferencia.trim() ? numeroReferencia.trim() : null,
        observaciones: typeof observaciones === "string" && observaciones.trim() ? observaciones.trim() : null,
        comprobante_contenido: hex,
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

interface LineaAbono {
  tipoOrigen: "planilla" | "recibo_caja";
  fecha: string;
  valor: number;
  numeroReferencia?: string;
}

/** Reporta varias consignaciones (cada una con su fecha, motivo y valor) en un
 * solo envío, compartiendo UNA sola foto/comprobante -- para cuando una misma
 * foto (ej. un extracto o varios recibos fotografiados juntos) respalda varios
 * valores distintos y no tiene sentido repetir la subida del archivo por cada
 * uno. */
export async function reportarSedeAbonos(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "NO_SESSION" };
  if (user.role !== "sede" || !user.sede) return { ok: false, error: "Solo un usuario de sede puede reportar abonos." };

  const lineasRaw = formData.get("lineas");
  const comprobante = formData.get("comprobante");

  if (typeof lineasRaw !== "string") return { ok: false, error: "Faltan las consignaciones a reportar." };
  let lineas: LineaAbono[];
  try {
    lineas = JSON.parse(lineasRaw);
  } catch {
    return { ok: false, error: "No se pudieron leer las consignaciones." };
  }
  if (!Array.isArray(lineas) || lineas.length === 0) return { ok: false, error: "Agrega al menos una consignación." };
  if (lineas.length > 20) return { ok: false, error: "Máximo 20 consignaciones por envío." };

  for (const linea of lineas) {
    if (linea.tipoOrigen !== "planilla" && linea.tipoOrigen !== "recibo_caja") {
      return { ok: false, error: "Selecciona si cada consignación es planilla o recibos de caja." };
    }
    if (typeof linea.fecha !== "string" || !linea.fecha) return { ok: false, error: "Falta la fecha de alguna consignación." };
    if (!Number.isFinite(linea.valor) || linea.valor <= 0) return { ok: false, error: "El valor de cada consignación debe ser mayor a cero." };
  }

  if (!(comprobante instanceof File) || comprobante.size === 0) return { ok: false, error: "Adjunta la foto o PDF del comprobante." };
  if (comprobante.size > MAX_FILE_BYTES) return { ok: false, error: "El comprobante no puede pesar más de 5 MB." };
  if (!ALLOWED_MIME.has(comprobante.type)) return { ok: false, error: "El comprobante debe ser una imagen (JPG/PNG/WEBP) o un PDF." };

  const providerId = await getPintucoProviderId();
  const bytes = await comprobante.arrayBuffer();
  const hex = `\\x${Buffer.from(bytes).toString("hex")}`;

  const res = await postgrestFetch(
    "/sede_abono",
    {
      method: "POST",
      body: JSON.stringify(
        lineas.map((linea) => ({
          provider_id: providerId,
          sede: user.sede,
          tipo_origen: linea.tipoOrigen,
          periodo_desde: linea.fecha,
          periodo_hasta: linea.fecha,
          valor: linea.valor,
          numero_referencia: linea.numeroReferencia?.trim() || null,
          observaciones: null,
          comprobante_contenido: hex,
          comprobante_mime: comprobante.type,
          created_by: user.id,
        }))
      ),
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
