import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface Provider {
  id: number;
  codigo_proveedor: string | null;
  nif: string | null;
  nombre: string;
  nombre_normalizado: string;
  activo: boolean;
  email_pago: string | null;
  email_cc: string | null;
  email_alertas: string | null;
  contacto_pagos: string | null;
  contacto_tesoreria: string | null;
  telefono: string | null;
  condiciones_comerciales: string | null;
  observaciones: string | null;
}

export async function getProviders(q?: string): Promise<Provider[]> {
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "nombre.asc");
  if (q) {
    const cleaned = q.replace(/[,()]/g, "");
    params.set("or", `(nombre.ilike.*${cleaned}*,nif.ilike.*${cleaned}*,codigo_proveedor.ilike.*${cleaned}*)`);
  }

  const res = await postgrestFetch(`/provider?${params.toString()}`, {}, "providers");
  if (!res.ok) {
    throw new Error(`PostgREST /provider -> HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
