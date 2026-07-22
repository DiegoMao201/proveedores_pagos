import { BuscarReferencia } from "@/components/referencias/buscar-referencia";

export default function ReferenciasPage() {
  return (
    <main className="min-h-screen bg-parchment px-4 py-8">
      <div className="mx-auto flex max-w-[720px] flex-col gap-4">
        <div className="text-center">
          <span className="text-xl font-extrabold text-red">Ferreinox</span>
          <h1 className="mt-1 text-ink" style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 19 }}>
            Referencias facturadas
          </h1>
          <p className="mt-1 text-stone" style={{ fontSize: 12 }}>
            Verifica si un producto ya viene facturado antes de confirmar su estado con bodega o compras.
          </p>
        </div>
        <BuscarReferencia />
      </div>
    </main>
  );
}
