import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function LotesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Lotes de pago</h1>
        <p className="text-sm text-stone">Historial y estado de lotes armados.</p>
      </div>
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <Construction size={48} className="text-stone" />
        <p className="max-w-md text-sm text-stone">
          El armado de lotes vive en el Bloque 2. Aquí verás el historial y estado de cada lote una
          vez habilitada la escritura.
        </p>
      </Card>
    </div>
  );
}
