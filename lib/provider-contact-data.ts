import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface ProviderContactRow {
  id: number;
  provider_id: number;
  nombre: string | null;
  email: string;
  notas: string | null;
  activo: boolean;
}

export async function getProviderContacts(providerId: number): Promise<ProviderContactRow[]> {
  const res = await postgrestFetch(
    `/provider_contact?provider_id=eq.${providerId}&activo=eq.true&select=*&order=id.asc`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /provider_contact -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getProviderContactsForProviders(providerIds: number[]): Promise<ProviderContactRow[]> {
  if (providerIds.length === 0) return [];
  const res = await postgrestFetch(
    `/provider_contact?provider_id=in.(${providerIds.join(",")})&activo=eq.true&select=*`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /provider_contact -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}
