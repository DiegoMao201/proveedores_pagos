import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { NotificarForm } from "@/components/lotes/notificar-form";
import { getBatchByCode } from "@/lib/batch-data";
import { getBatchProviderBreakdown } from "@/lib/lotes-data";

interface PageProps {
  params: Promise<{ codigo: string }>;
}

export default async function NotificarPagoPage({ params }: PageProps) {
  const { codigo } = await params;
  const session = await auth();
  const canEdit = session?.user.role ? ["admin", "tesoreria", "contabilidad"].includes(session.user.role) : false;
  if (!canEdit) redirect(`/lotes/${codigo}`);

  const batch = await getBatchByCode(codigo);
  if (!batch) notFound();
  if (batch.estado !== "paid") redirect(`/lotes/${codigo}`);

  const breakdown = await getBatchProviderBreakdown(batch.id);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-stone" style={{ fontSize: 11 }}>
        <Link href="/lotes" className="hover:text-red-deep">Lotes</Link> /{" "}
        <Link href={`/lotes/${codigo}`} className="hover:text-red-deep">{codigo}</Link> / Notificar
      </p>

      <div>
        <h1 className="text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
          {batch.es_multiproveedor ? "Notificar pagos del lote consolidado" : "Notificar pago al proveedor"}
        </h1>
        <p className="text-stone" style={{ fontSize: 12 }}>
          Cada proveedor recibirá solo sus facturas del lote. CC automático a gerencia@ferreinox.co en envío real.
        </p>
      </div>

      {breakdown.length === 0 ? (
        <Card><p className="text-stone" style={{ fontSize: 11 }}>No hay proveedores en este lote.</p></Card>
      ) : (
        <NotificarForm codigoLote={codigo} breakdown={breakdown} />
      )}
    </div>
  );
}
