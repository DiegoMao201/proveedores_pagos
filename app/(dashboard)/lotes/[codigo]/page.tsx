import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { LoteDetail } from "@/components/lotes/lote-detail";
import { getBatchByCode } from "@/lib/batch-data";
import { getBatchProviderBreakdown, getBatchItemsDetail, getBatchAuditLog, getBatchDiscrepancy } from "@/lib/lotes-data";
import { getAvailableSedeAbonosForProvider, getAppliedSedeAbonosForBatch } from "@/lib/sede-abono-data";

interface PageProps {
  params: Promise<{ codigo: string }>;
}

export default async function LoteDetailPage({ params }: PageProps) {
  const { codigo } = await params;
  const session = await auth();
  const canEdit = session?.user.role ? ["admin", "tesoreria", "contabilidad"].includes(session.user.role) : false;

  const batch = await getBatchByCode(codigo);
  if (!batch) notFound();

  let dataError: string | null = null;
  let breakdown: Awaited<ReturnType<typeof getBatchProviderBreakdown>> = [];
  let items: Awaited<ReturnType<typeof getBatchItemsDetail>> = [];
  let auditLog: Awaited<ReturnType<typeof getBatchAuditLog>> = [];
  let discrepancy: Awaited<ReturnType<typeof getBatchDiscrepancy>> = [];
  let abonosDisponibles: Awaited<ReturnType<typeof getAvailableSedeAbonosForProvider>> = [];
  let abonosAplicados: Awaited<ReturnType<typeof getAppliedSedeAbonosForBatch>> = [];

  try {
    [breakdown, items, auditLog, discrepancy, abonosAplicados] = await Promise.all([
      getBatchProviderBreakdown(batch.id),
      getBatchItemsDetail(batch.id),
      getBatchAuditLog(batch.id),
      getBatchDiscrepancy(batch.id),
      getAppliedSedeAbonosForBatch(batch.id),
    ]);
    if (!batch.es_multiproveedor && batch.proveedor_id) {
      abonosDisponibles = await getAvailableSedeAbonosForProvider(batch.proveedor_id);
    }
  } catch (error) {
    dataError = error instanceof Error ? error.message : "Error desconocido";
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-stone" style={{ fontSize: 11 }}>
        <Link href="/lotes" className="hover:text-red-deep">Lotes</Link> / {batch.codigo_lote}
      </p>

      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="text-sm font-semibold text-red-deep">No pudimos cargar el detalle del lote. Verifica tu conexión y reintenta.</p>
        </Card>
      ) : (
        <LoteDetail
          batch={batch}
          breakdown={breakdown}
          items={items}
          auditLog={auditLog}
          discrepancy={discrepancy}
          canEdit={canEdit}
          abonosDisponibles={abonosDisponibles}
          abonosAplicados={abonosAplicados}
        />
      )}
    </div>
  );
}
