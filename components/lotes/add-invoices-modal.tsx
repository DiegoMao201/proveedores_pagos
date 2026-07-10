"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { formatFull, formatDateEs } from "@/lib/format";
import { addInvoicesToBatch } from "@/lib/lotes-actions";
import { recalculateInvoices } from "@/lib/batch-actions";
import type { ProviderInvoiceCalc } from "@/lib/batch-data";

export function AddInvoicesModal({
  open,
  onClose,
  batchId,
  codigoLote,
  providerId,
  providerNombre,
  fechaPago,
}: {
  open: boolean;
  onClose: () => void;
  batchId: number;
  codigoLote: string;
  providerId: number;
  providerNombre: string;
  fechaPago: string;
}) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<ProviderInvoiceCalc[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setInvoices([]);
    setLoading(true);
    recalculateInvoices(providerId, fechaPago)
      .then((rows) => setInvoices(rows.filter((r) => r.es_seleccionable)))
      .catch(() => showToast({ kind: "error", message: "No se pudieron cargar las facturas disponibles." }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, providerId, fechaPago]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await addInvoicesToBatch(batchId, Array.from(selected), codigoLote);
      if (result.ok) {
        showToast({ kind: "success", message: `${result.numAgregadas ?? selected.size} factura(s) agregada(s) al lote.` });
        onClose();
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudieron agregar las facturas." });
      }
    });
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Agregar facturas — ${providerNombre}`} width={560}>
        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-stone" style={{ fontSize: 11 }}>Cargando facturas disponibles…</p>
          ) : invoices.length === 0 ? (
            <p className="text-stone" style={{ fontSize: 11 }}>No hay facturas disponibles para agregar de este proveedor.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-md border border-line">
              <table className="w-full" style={{ fontSize: 11 }}>
                <thead>
                  <tr className="border-b border-line bg-parchment text-stone" style={{ fontSize: 9, textTransform: "uppercase" }}>
                    <th className="px-2 py-2" style={{ width: 24 }}></th>
                    <th className="px-2 py-2 text-left">Documento</th>
                    <th className="px-2 py-2 text-left">Emisión</th>
                    <th className="px-2 py-2 text-right">Bruto</th>
                    <th className="px-2 py-2 text-right">Neto est.</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.invoice_key}
                      className="cursor-pointer border-b border-line last:border-0 hover:bg-cream-soft"
                      onClick={() => toggle(inv.invoice_key)}
                    >
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={selected.has(inv.invoice_key)}
                          onChange={() => toggle(inv.invoice_key)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 13, height: 13 }}
                        />
                      </td>
                      <td className="px-2 py-1.5 font-semibold text-ink">{inv.num_factura}</td>
                      <td className="date px-2 py-1.5 text-stone">{formatDateEs(inv.fecha_emision)}</td>
                      <td className="num px-2 py-1.5 text-right">{formatFull(inv.valor_bruto)}</td>
                      <td className="num px-2 py-1.5 text-right font-semibold">{formatFull(inv.valor_neto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending || selected.size === 0}
              onClick={handleConfirm}
              className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
              style={{ fontSize: 11, fontWeight: 800 }}
            >
              {pending ? "Agregando…" : `Agregar ${selected.size} factura${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
