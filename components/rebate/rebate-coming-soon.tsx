import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RebateTabs } from "@/components/layout/rebate-tabs";

export function RebateComingSoon({
  provider,
  cycle,
}: {
  provider: "pintuco" | "abracol" | "goya";
  cycle: string;
}) {
  const label = provider.charAt(0).toUpperCase() + provider.slice(1);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Rebate {label}</h1>
        <p className="text-sm text-stone">Ciclo {cycle}.</p>
      </div>
      <RebateTabs active={provider} />
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <Construction size={48} className="text-stone" />
        <p className="max-w-md text-sm text-stone">
          El motor de cálculo de {label} (escalas, progreso, simulador en vivo) se está portando desde
          Streamlit con las reglas de negocio exactas. Llega en la siguiente entrega de este bloque.
        </p>
      </Card>
    </div>
  );
}
