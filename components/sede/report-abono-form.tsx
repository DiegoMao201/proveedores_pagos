"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus, Send, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Toast, useToast } from "@/components/ui/toast";
import { reportarSedeAbonos } from "@/lib/sede-abono-actions";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Linea {
  tipoOrigen: "" | "planilla" | "recibo_caja";
  fecha: string;
  valor: string;
  numeroReferencia: string;
}

function nuevaLinea(): Linea {
  return { tipoOrigen: "", fecha: todayIso(), valor: "", numeroReferencia: "" };
}

export function ReportAbonoForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([nuevaLinea()]);

  function updateLinea(index: number, patch: Partial<Linea>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLinea() {
    if (lineas.length >= 20) return;
    setLineas((prev) => [...prev, nuevaLinea()]);
  }

  function removeLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    setLineas([nuevaLinea()]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast({ kind: "error", message: "Adjunta la foto o PDF del comprobante." });
      return;
    }
    for (const l of lineas) {
      if (!l.tipoOrigen) {
        showToast({ kind: "error", message: "Selecciona el motivo de cada consignación." });
        return;
      }
      if (!l.fecha) {
        showToast({ kind: "error", message: "Falta la fecha de alguna consignación." });
        return;
      }
      const valorNum = Number(l.valor);
      if (!Number.isFinite(valorNum) || valorNum <= 0) {
        showToast({ kind: "error", message: "El valor de cada consignación debe ser mayor a cero." });
        return;
      }
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("comprobante", file);
      formData.set(
        "lineas",
        JSON.stringify(
          lineas.map((l) => ({
            tipoOrigen: l.tipoOrigen,
            fecha: l.fecha,
            valor: Number(l.valor),
            numeroReferencia: l.numeroReferencia,
          }))
        )
      );
      const result = await reportarSedeAbonos(formData);
      if (result.ok) {
        showToast({ kind: "success", message: lineas.length > 1 ? `${lineas.length} consignaciones reportadas correctamente.` : "Abono reportado correctamente." });
        reset();
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
        Si una misma foto respalda varias consignaciones, agrega una fila por cada valor — todas comparten la misma foto.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {lineas.map((linea, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-md border border-line bg-parchment p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-stone" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                Consignación {i + 1}
              </span>
              {lineas.length > 1 && (
                <button type="button" onClick={() => removeLinea(i)} className="text-stone hover:text-red-deep" title="Quitar">
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Motivo</span>
              <select
                required
                value={linea.tipoOrigen}
                onChange={(e) => updateLinea(i, { tipoOrigen: e.target.value as Linea["tipoOrigen"] })}
                className="rounded-md border border-line bg-paper px-3 py-2"
                style={{ fontSize: 13 }}
              >
                <option value="" disabled>Selecciona una opción…</option>
                <option value="planilla">Planilla (cierre de caja)</option>
                <option value="recibo_caja">Recibos de caja (abonos a cartera)</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Fecha</span>
                <input
                  type="date"
                  required
                  value={linea.fecha}
                  max={todayIso()}
                  onChange={(e) => updateLinea(i, { fecha: e.target.value })}
                  className="rounded-md border border-line bg-paper px-3 py-2"
                  style={{ fontSize: 13 }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Valor</span>
                <input
                  type="number"
                  required
                  min={1}
                  step="0.01"
                  placeholder="0"
                  value={linea.valor}
                  onChange={(e) => updateLinea(i, { valor: e.target.value })}
                  className="rounded-md border border-line bg-paper px-3 py-2"
                  style={{ fontSize: 13 }}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Número de referencia / consignación (opcional)</span>
              <input
                type="text"
                placeholder="Ej: consignación #123456"
                value={linea.numeroReferencia}
                onChange={(e) => updateLinea(i, { numeroReferencia: e.target.value })}
                className="rounded-md border border-line bg-paper px-3 py-2"
                style={{ fontSize: 13 }}
              />
            </label>
          </div>
        ))}

        <button
          type="button"
          onClick={addLinea}
          disabled={lineas.length >= 20}
          className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-line px-3 py-2 text-graphite hover:border-red-deep hover:text-red-deep disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontSize: 12, fontWeight: 700 }}
        >
          <Plus size={14} /> Agregar otra consignación
        </button>

        <label className="flex flex-col gap-1.5">
          <span className="text-stone" style={{ fontSize: 10.5, fontWeight: 700 }}>Foto o PDF del comprobante (compartido para todas las consignaciones de arriba)</span>
          <div className="flex items-center gap-2 rounded-md border border-dashed border-line bg-paper px-3 py-3">
            <Camera size={16} className="text-stone" />
            <span className="text-graphite" style={{ fontSize: 12 }}>{fileName ?? "Toca para elegir una foto o archivo…"}</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="text-graphite"
            style={{ fontSize: 12 }}
          />
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="flex items-center justify-center gap-1.5 rounded-md bg-red-deep px-4 py-2.5 text-white disabled:opacity-40"
          style={{ fontSize: 13, fontWeight: 800 }}
        >
          <Send size={15} /> {pending ? "Enviando…" : lineas.length > 1 ? `Reportar ${lineas.length} consignaciones` : "Reportar abono"}
        </button>
      </div>
      <Toast toast={toast} />
    </Card>
  );
}
