"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { excludeInvoice, excludeInvoicesBatch } from "@/lib/exclusion-actions";
import { formatFull } from "@/lib/format";

const MIN_MOTIVO_LENGTH = 10;

export interface ExclusionCandidate {
  invoiceKey: string;
  numFactura: string;
  proveedor: string;
  valor: number;
}

export function ExclusionModal({
  open,
  onClose,
  candidates,
  source,
  onExcluded,
}: {
  open: boolean;
  onClose: () => void;
  candidates: ExclusionCandidate[];
  source: string;
  onExcluded: () => void;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isValid = motivo.trim().length >= MIN_MOTIVO_LENGTH;
  const isBatch = candidates.length > 1;

  function handleClose() {
    setMotivo("");
    setError(null);
    onClose();
  }

  function handleConfirm() {
    if (!isValid) return;
    startTransition(async () => {
      setError(null);
      const result = isBatch
        ? await excludeInvoicesBatch(candidates.map((c) => c.invoiceKey), motivo, source)
        : await excludeInvoice(candidates[0].invoiceKey, motivo, source);

      if (result.ok) {
        onExcluded();
        handleClose();
        router.refresh();
      } else {
        setError(result.error ?? "No se pudo excluir.");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Excluir factura(s) del panel" width={480}>
      <div className="flex flex-col gap-3">
        <p className="text-stone" style={{ fontSize: 10 }}>
          {isBatch
            ? `${candidates.length} facturas seleccionadas`
            : candidates[0]
            ? `Factura: ${candidates[0].numFactura} · ${candidates[0].proveedor}`
            : ""}
        </p>

        <div
          className="rounded-md px-3.5 py-2.5"
          style={{ background: "var(--color-cream-soft)", borderLeft: "3px solid var(--color-yellow)" }}
        >
          <p style={{ fontSize: 10.5 }}>
            Las facturas excluidas dejan de aparecer en Conciliación y en la vista de proveedor. Se pueden reactivar
            desde el tab &quot;Excluidas&quot;.
          </p>
        </div>

        {candidates.length > 0 && (
          <div className="max-h-32 overflow-y-auto rounded-md border border-line" style={{ fontSize: 10.5 }}>
            {candidates.slice(0, 5).map((c) => (
              <div key={c.invoiceKey} className="flex justify-between border-b border-line px-2.5 py-1.5 last:border-0">
                <span className="text-ink">
                  {c.proveedor} · {c.numFactura}
                </span>
                <span className="num text-stone">{formatFull(c.valor)}</span>
              </div>
            ))}
            {candidates.length > 5 && (
              <div className="px-2.5 py-1.5 text-stone">y {candidates.length - 5} más...</div>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-semibold text-ink" style={{ fontSize: 11 }}>
            Motivo de la exclusión *
          </span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ej: Factura duplicada por error del proveedor. Ya se pagó la versión correcta."
            className="rounded-md border border-line bg-paper px-3 py-2"
            style={{ fontSize: 11.5 }}
          />
          <span className={isValid ? "text-stone" : "text-red-deep"} style={{ fontSize: 9.5 }}>
            Mínimo {MIN_MOTIVO_LENGTH} caracteres ({motivo.trim().length}/{MIN_MOTIVO_LENGTH})
          </span>
        </label>

        {error && (
          <p className="flex items-center gap-1.5 text-red-deep" style={{ fontSize: 10.5 }}>
            <AlertTriangle size={12} /> {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-line px-3 py-1.5 text-graphite"
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isValid || pending}
            onClick={handleConfirm}
            className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {pending ? "Excluyendo…" : `Excluir factura${isBatch ? "s" : ""}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
