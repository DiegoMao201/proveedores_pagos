"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Toast, useToast } from "@/components/ui/toast";
import { reportarSedeAbono } from "@/lib/sede-abono-actions";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReportAbonoForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await reportarSedeAbono(formData);
      if (result.ok) {
        showToast({ kind: "success", message: "Abono reportado correctamente." });
        formRef.current?.reset();
        setFileName(null);
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudo reportar el abono." });
      }
    });
  }

  return (
    <Card>
      <p className="text-ink" style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>Reportar consignación a Pintuco</p>
      <p className="text-stone" style={{ fontSize: 11, marginTop: 2 }}>
        Registra aquí la plata que consignaste directamente a la cuenta de Pintuco (cuadre de caja, cartera, etc.) en vez de reportarla por WhatsApp.
      </p>
      <form ref={formRef} action={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Fecha de la consignación</span>
            <input
              type="date"
              name="fecha_consignacion"
              required
              defaultValue={todayIso()}
              max={todayIso()}
              className="rounded-md border border-line bg-paper px-3 py-2"
              style={{ fontSize: 13 }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Valor consignado</span>
            <input
              type="number"
              name="valor"
              required
              min={1}
              step="0.01"
              placeholder="0"
              className="rounded-md border border-line bg-paper px-3 py-2"
              style={{ fontSize: 13 }}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Número de referencia / consignación (opcional)</span>
          <input
            type="text"
            name="numero_referencia"
            placeholder="Ej: consignación #123456"
            className="rounded-md border border-line bg-paper px-3 py-2"
            style={{ fontSize: 13 }}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Observaciones (opcional)</span>
          <textarea
            name="observaciones"
            rows={2}
            placeholder="Ej: cuadre de caja del 15 de julio"
            className="rounded-md border border-line bg-paper px-3 py-2"
            style={{ fontSize: 13 }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Foto o PDF del comprobante</span>
          <div className="flex items-center gap-2 rounded-md border border-dashed border-line bg-paper px-3 py-3">
            <Camera size={16} className="text-stone" />
            <span className="text-graphite" style={{ fontSize: 12 }}>{fileName ?? "Toca para elegir una foto o archivo…"}</span>
          </div>
          <input
            type="file"
            name="comprobante"
            required
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="text-graphite"
            style={{ fontSize: 12 }}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-1.5 rounded-md bg-red-deep px-4 py-2.5 text-white disabled:opacity-40"
          style={{ fontSize: 13, fontWeight: 800 }}
        >
          <Send size={15} /> {pending ? "Enviando…" : "Reportar abono"}
        </button>
      </form>
      <Toast toast={toast} />
    </Card>
  );
}
