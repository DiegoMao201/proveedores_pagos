import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PlanificadorPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Planificador de pagos</h1>
        <p className="text-sm text-stone">Mesas de decisión: críticos, financiero, neto.</p>
      </div>
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <Construction size={48} className="text-stone" />
        <p className="max-w-md text-sm text-stone">
          El planificador con las 3 mesas de decisión (portadas de Streamlit) y las notas crédito
          llega en la siguiente entrega de este bloque, en modo lectura.
        </p>
      </Card>
    </div>
  );
}
