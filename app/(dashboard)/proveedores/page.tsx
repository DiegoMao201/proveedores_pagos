import Link from "next/link";
import { AlertCircle, Building2 } from "lucide-react";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { BankStatusBadge } from "@/components/providers/bank-status-badge";
import { NewProviderModal } from "@/components/providers/new-provider-modal";
import { ImportBancolombiaModal } from "@/components/providers/import-bancolombia-modal";
import { ImportProvidersModal } from "@/components/providers/import-providers-modal";
import { UnknownProvidersSection } from "@/components/providers/unknown-providers-section";
import { getProviderList, getUnknownProviders } from "@/lib/bank-account-data";
import { humanizeProviderName } from "@/lib/format";

const CATEGORIA_LABEL: Record<string, string> = {
  estrategico: "Estratégico",
  operativo: "Operativo",
  locativo: "Locativo",
  esporadico: "Esporádico",
  institucional: "Institucional",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ProveedoresPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const session = await auth();
  const isAdmin = session?.user.role === "admin";

  let providers: Awaited<ReturnType<typeof getProviderList>> = [];
  let dataError: string | null = null;
  let unknownProviders: Awaited<ReturnType<typeof getUnknownProviders>> = [];

  try {
    providers = await getProviderList(sp.q, sp.categoria_proveedor, sp.estado_bancario);
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  try {
    unknownProviders = await getUnknownProviders();
  } catch {
    unknownProviders = [];
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-ink" style={{ fontWeight: 800, fontSize: 19 }}>
            Proveedores
          </h1>
          <p className="text-stone" style={{ fontSize: 11 }}>
            Catálogo de proveedores — perfil, condiciones comerciales y cuentas bancarias.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <ImportProvidersModal />}
          {isAdmin && <ImportBancolombiaModal />}
          <NewProviderModal />
        </div>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar los proveedores. {dataError}
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
          <TableToolbar
            searchPlaceholder="Buscar por nombre, NIF o código..."
            filterFields={[
              {
                name: "categoria_proveedor",
                label: "Categoría",
                type: "select",
                options: Object.entries(CATEGORIA_LABEL).map(([value, label]) => ({ value, label })),
              },
              {
                name: "estado_bancario",
                label: "Estado bancario",
                type: "select",
                options: [
                  { value: "pagable", label: "Pagable" },
                  { value: "sin_cuenta", label: "Sin cuenta" },
                  { value: "inactivo", label: "Inactivo" },
                ],
              },
            ]}
          />

          {providers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Building2 size={48} className="text-stone" />
              <p className="max-w-sm text-sm text-stone">No hay proveedores que coincidan con este filtro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 12 }}>
                <thead className="bg-parchment text-left text-stone" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <tr>
                    <th className="px-6 py-3">Nombre</th>
                    <th className="px-4 py-3">NIT</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Plazo pago</th>
                    <th className="px-6 py-3">Email de pago</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0 hover:bg-cream/30">
                      <td className="px-6 py-3">
                        <Link href={`/proveedores/${p.id}`} className="font-semibold text-ink hover:text-red">
                          {humanizeProviderName(p.nombre)}
                        </Link>
                      </td>
                      <td className="num px-4 py-3 text-stone">{p.nif ?? "—"}</td>
                      <td className="px-4 py-3 text-stone">{p.categoria_proveedor ? CATEGORIA_LABEL[p.categoria_proveedor] : "—"}</td>
                      <td className="px-4 py-3">
                        <BankStatusBadge activo={p.activo} tieneCuentaActiva={p.tiene_cuenta_activa} />
                      </td>
                      <td className="num px-4 py-3 text-stone">{p.plazo_pago_dias ? `${p.plazo_pago_dias}d` : "—"}</td>
                      <td className="px-6 py-3 text-stone">{p.email_pago ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <UnknownProvidersSection rows={unknownProviders} />
    </div>
  );
}
