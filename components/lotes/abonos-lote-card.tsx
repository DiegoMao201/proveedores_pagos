"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Eye, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Toast, useToast } from "@/components/ui/toast";
import { formatFull, formatDateEs } from "@/lib/format";
import { applySedeAbonosToBatch, unapplySedeAbono } from "@/lib/sede-abono-actions";
import type { SedeAbonoRow } from "@/lib/sede-abono-data";

export function AbonosLoteCard({
  batchId,
  codigoLote,
  editable,
  abonosDisponibles,
  abonosAplicados,
}: {
  batchId: number;
  codigoLote: string;
  editable: boolean;
  abonosDisponibles: SedeAbonoRow[];
  abonosAplicados: SedeAbonoRow[];
}) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (abonosDisponibles.length === 0 && abonosAplicados.length === 0) return null;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleApply() {
    startTransition(async () => {
      const result = await applySedeAbonosToBatch(batchId, Array.from(selected), codigoLote);
      if (result.ok) {
        showToast({ kind: "success", message: "Abonos aplicados al lote." });
        setSelected(new Set());
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudieron aplicar los abonos." });
      }
    });
  }

  function handleUnapply(abonoId: number) {
    startTransition(async () => {
      const result = await unapplySedeAbono(abonoId, codigoLote);
      if (result.ok) {
        showToast({ kind: "success", message: "Abono desaplicado." });
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudo desaplicar." });
      }
    });
  }

  const totalSeleccionado = abonosDisponibles.filter((a) => selected.has(a.id)).reduce((s, a) => s + a.valor, 0);

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3.5 py-2.5" style={{ background: "var(--color-parchment)" }}>
        <Landmark size={13} className="text-stone" />
        <p className="text-ink" style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Abonos de sede</p>
      </div>

      {abonosAplicados.length > 0 && (
        <div className="border-b border-line">
          {abonosAplicados.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-line px-3.5 py-2 last:border-0" style={{ fontSize: 11.5 }}>
              <div>
                <span className="font-semibold text-ink">{a.sede}</span>{" "}
                <span className="text-stone">{formatDateEs(a.fecha_consignacion)} {a.numero_referencia ? `· ${a.numero_referencia}` : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="num text-success font-semibold">−{formatFull(a.valor)}</span>
                <a href={`/api/abonos/${a.id}/comprobante`} target="_blank" rel="noreferrer" className="text-stone hover:text-red-deep" title="Ver comprobante">
                  <Eye size={13} />
                </a>
                {editable && (
                  <button type="button" disabled={pending} onClick={() => handleUnapply(a.id)} className="text-stone hover:text-red-deep" title="Desaplicar de este lote">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editable && abonosDisponibles.length > 0 && (
        <div>
          <p className="px-3.5 pt-2.5 text-stone" style={{ fontSize: 10.5 }}>
            Disponibles para aplicar a este lote — se descuentan del monto a transferir por banco:
          </p>
          {abonosDisponibles.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center justify-between border-b border-line px-3.5 py-2 last:border-0 hover:bg-cream-soft" style={{ fontSize: 11.5 }}>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} style={{ width: 13, height: 13 }} />
                <span className="font-semibold text-ink">{a.sede}</span>
                <span className="text-stone">{formatDateEs(a.fecha_consignacion)} {a.numero_referencia ? `· ${a.numero_referencia}` : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="num text-ink font-semibold">{formatFull(a.valor)}</span>
                <a
                  href={`/api/abonos/${a.id}/comprobante`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-stone hover:text-red-deep"
                  title="Ver comprobante"
                >
                  <Eye size={13} />
                </a>
              </div>
            </label>
          ))}
          <div className="flex items-center justify-end gap-2 px-3.5 py-2.5">
            {selected.size > 0 && (
              <span className="text-stone" style={{ fontSize: 11 }}>Total seleccionado: {formatFull(totalSeleccionado)}</span>
            )}
            <button
              type="button"
              disabled={pending || selected.size === 0}
              onClick={handleApply}
              className="rounded-md bg-red-deep px-3.5 py-1.5 text-white disabled:opacity-40"
              style={{ fontSize: 11.5, fontWeight: 800 }}
            >
              {pending ? "Aplicando…" : `Aplicar ${selected.size || ""} abono${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </Card>
  );
}
