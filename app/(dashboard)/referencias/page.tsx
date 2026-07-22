import { BuscarReferencia } from "@/components/referencias/buscar-referencia";

export default function ReferenciasPage() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
          Referencias facturadas
        </h1>
        <p className="text-stone" style={{ fontSize: 12 }}>
          Verifica si un producto ya viene facturado antes de confirmar su estado con bodega o compras.
        </p>
      </div>
      <BuscarReferencia />
    </div>
  );
}
