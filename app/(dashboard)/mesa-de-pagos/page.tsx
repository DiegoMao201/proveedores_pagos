import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { MesaDePagosWorkspace } from "@/components/mesa/mesa-workspace";
import { getMesaInvoices } from "@/lib/mesa-data";
import { getOwnBankAccounts, getDataFreshness } from "@/lib/batch-data";

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function MesaDePagosPage() {
  const session = await auth();
  const canEdit = session?.user.role ? ["admin", "tesoreria", "contabilidad"].includes(session.user.role) : false;

  let dataError: string | null = null;
  let invoices: Awaited<ReturnType<typeof getMesaInvoices>> = [];
  let ownAccounts: Awaited<ReturnType<typeof getOwnBankAccounts>> = [];
  let freshness: Awaited<ReturnType<typeof getDataFreshness>> = null;

  try {
    [invoices, ownAccounts, freshness] = await Promise.all([
      getMesaInvoices(tomorrowIso()),
      getOwnBankAccounts(),
      getDataFreshness(),
    ]);
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
          Mesa de pagos
        </h1>
        <p className="text-stone" style={{ fontSize: 12 }}>
          Selecciona facturas de múltiples proveedores para armar un lote consolidado.
        </p>
      </div>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="text-sm font-semibold text-red-deep">No pudimos cargar la mesa de pagos. Verifica tu conexión y reintenta.</p>
        </Card>
      ) : (
        <MesaDePagosWorkspace initialInvoices={invoices} ownAccounts={ownAccounts} freshness={freshness} canEdit={canEdit} />
      )}
    </div>
  );
}
