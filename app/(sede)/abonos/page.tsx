import { Card } from "@/components/ui/card";
import { ReportAbonoForm } from "@/components/sede/report-abono-form";
import { SedeAbonoHistory } from "@/components/sede/sede-abono-history";
import { getMisSedeAbonos } from "@/lib/sede-abono-data";

export default async function AbonosSedePage() {
  let abonos: Awaited<ReturnType<typeof getMisSedeAbonos>> = [];
  let dataError = false;
  try {
    abonos = await getMisSedeAbonos();
  } catch (error) {
    console.error("[abonos] getMisSedeAbonos failed:", error);
    dataError = true;
  }

  return (
    <div className="flex flex-col gap-3">
      <ReportAbonoForm />
      {dataError ? (
        <Card className="border-red-deep bg-cream">
          <p className="text-sm font-semibold text-red-deep">No pudimos cargar tu historial. Verifica tu conexión y reintenta.</p>
        </Card>
      ) : (
        <SedeAbonoHistory abonos={abonos} />
      )}
    </div>
  );
}
