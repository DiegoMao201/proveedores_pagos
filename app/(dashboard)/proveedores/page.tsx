import { AlertCircle, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { getProviders } from "@/lib/providers-data";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ProveedoresPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  let providers: Awaited<ReturnType<typeof getProviders>> = [];
  let dataError: string | null = null;

  try {
    providers = await getProviders(sp.q);
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Proveedores</h1>
        <p className="text-sm text-stone">Catálogo de proveedores (solo lectura por ahora).</p>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            No pudimos cargar los proveedores. Verifica tu conexión y reintenta.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
          <TableToolbar searchPlaceholder="Buscar por nombre, NIF o código..." />

          {providers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Building2 size={48} className="text-stone" />
              <p className="max-w-sm text-sm text-stone">
                Todavía no hay proveedores registrados en el catálogo. Se cargan al migrar la base de
                proveedores desde Excel — la inscripción desde esta pantalla llega en la Iteración 3
                del plan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
                  <tr>
                    <th className="px-6 py-3">Código</th>
                    <th className="px-4 py-3">NIF</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">Email de pago</th>
                    <th className="px-6 py-3">Contacto de pagos</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0 hover:bg-cream/30">
                      <td className="num px-6 py-3">{p.codigo_proveedor ?? "—"}</td>
                      <td className="num px-4 py-3">{p.nif ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{p.nombre}</td>
                      <td className="px-4 py-3">{p.activo ? "Sí" : "No"}</td>
                      <td className="px-4 py-3">{p.email_pago ?? "—"}</td>
                      <td className="px-6 py-3">{p.contacto_pagos ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
