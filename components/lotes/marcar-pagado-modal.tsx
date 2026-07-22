"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { formatFull, formatDateEs } from "@/lib/format";
import { markBatchPaid, markBatchPaidPartial } from "@/lib/lotes-actions";
import type { BatchItemDetailRow } from "@/lib/lotes-data";

export function MarcarPagadoModal({
  open,
  onClose,
  batchId,
  codigoLote,
  items,
}: {
  open: boolean;
  onClose: () => void;
  batchId: number;
  codigoLote: string;
  items: BatchItemDetailRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();
  const [paidIds, setPaidIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) setPaidIds(new Set(items.map((i) => i.id)));
  }, [open, items]);

  function toggle(id: number) {
    setPaidIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const todasSeleccionadas = paidIds.size === items.length;
  const netoSeleccionado = items.filter((i) => paidIds.has(i.id)).reduce((s, i) => s + i.valor_neto, 0);
  const noPagadas = items.length - paidIds.size;

  function handleConfirm() {
    if (paidIds.size === 0) {
      showToast({ kind: "error", message: "Marca al menos una factura como pagada." });
      return;
    }
    startTransition(async () => {
      const result = todasSeleccionadas
        ? await markBatchPaid(batchId, codigoLote)
        : await markBatchPaidPartial(batchId, Array.from(paidIds), codigoLote);
      if (result.ok) {
        const movidas = result.facturasMovidas ?? 0;
        const nuevoLote = result.nuevoCodigoLote;
        showToast({
          kind: "success",
          message:
            movidas > 0
              ? `Lote marcado como pagado. ${movidas} factura(s) sin pagar se movieron al nuevo lote ${nuevoLote}.`
              : "Lote marcado como pagado.",
        });
        onClose();
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudo marcar como pagado." });
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Marcar lote como pagado" width={560}>
      <div className="flex flex-col gap-3">
        <p className="text-stone" style={{ fontSize: 11 }}>
          Desmarca las facturas que NO se transfirieron. Las que dejes marcadas cierran este lote como pagado; las que desmarques se
          mueven automáticamente a un lote nuevo (borrador, editable) para pagarlas después.
        </p>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPaidIds(todasSeleccionadas ? new Set() : new Set(items.map((i) => i.id)))}
            className="text-stone hover:text-red-deep"
            style={{ fontSize: 10.5, fontWeight: 700 }}
          >
            {todasSeleccionadas ? "Desmarcar todas" : "Marcar todas"}
          </button>
          <span className="text-stone" style={{ fontSize: 10.5 }}>
            {paidIds.size} de {items.length} marcadas como pagadas
          </span>
        </div>

        <div className="flex max-h-80 flex-col overflow-y-auto rounded-md border border-line">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-0 hover:bg-cream-soft"
              style={{ fontSize: 12 }}
            >
              <input type="checkbox" checked={paidIds.has(item.id)} onChange={() => toggle(item.id)} />
              <span className="font-semibold text-ink" style={{ minWidth: 90 }}>{item.num_factura}</span>
              <span className="text-stone" style={{ minWidth: 90 }}>{item.fecha_emision ? formatDateEs(item.fecha_emision) : "—"}</span>
              <span className="ml-auto font-semibold">{formatFull(item.valor_neto)}</span>
            </label>
          ))}
        </div>

        <div className="rounded-md bg-parchment p-2.5">
          <p className="text-ink" style={{ fontSize: 12, fontWeight: 700 }}>
            Neto a marcar como pagado: {formatFull(netoSeleccionado)}
          </p>
          {noPagadas > 0 && (
            <p className="text-orange" style={{ fontSize: 10.5, marginTop: 2 }}>
              {noPagadas} factura(s) se moverán a un lote nuevo en borrador.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || paidIds.size === 0}
            onClick={handleConfirm}
            className="rounded-md bg-success px-4 py-1.5 text-white disabled:opacity-40"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {pending ? "Procesando…" : "Confirmar"}
          </button>
        </div>
      </div>
      <Toast toast={toast} />
    </Modal>
  );
}
