"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { reactivateInvoiceExclusion } from "@/lib/exclusion-actions";
import { formatDateEs } from "@/lib/format";

export function ReactivationModal({
  open,
  onClose,
  invoiceKey,
  numFactura,
  proveedor,
  motivoOriginal,
  excluidaAt,
  excluidaPorNombre,
  onReactivated,
}: {
  open: boolean;
  onClose: () => void;
  invoiceKey: string;
  numFactura: string | null;
  proveedor: string | null;
  motivoOriginal: string | null;
  excluidaAt: string;
  excluidaPorNombre: string | null;
  onReactivated: () => void;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setMotivo("");
    setError(null);
    onClose();
  }

  function handleConfirm() {
    startTransition(async () => {
      setError(null);
      const result = await reactivateInvoiceExclusion(invoiceKey, motivo);
      if (result.ok) {
        onReactivated();
        handleClose();
        router.refresh();
      } else {
        setError(result.error ?? "No se pudo reactivar.");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Reactivar exclusión" width={460}>
      <div className="flex flex-col gap-3">
        <p className="text-stone" style={{ fontSize: 10 }}>
          Factura: {numFactura ?? "—"} · {proveedor ?? "—"}
        </p>

        <div className="rounded-md bg-line-soft px-3.5 py-2.5" style={{ fontSize: 10.5 }}>
          <p>
            Excluida el {formatDateEs(excluidaAt)} por {excluidaPorNombre ?? "usuario desconocido"}
          </p>
          {motivoOriginal && <p className="mt-1">Motivo original: {motivoOriginal}</p>}
        </div>

        <div
          className="rounded-md px-3.5 py-2.5"
          style={{ background: "var(--color-cream-soft)", borderLeft: "3px solid var(--color-orange)" }}
        >
          <p style={{ fontSize: 10.5 }}>Al reactivar, la factura volverá a aparecer en Conciliación y vista de proveedor.</p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-semibold text-ink" style={{ fontSize: 11 }}>
            Motivo de reactivación (opcional)
          </span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder="Ej: El proveedor confirmó que la factura es válida."
            className="rounded-md border border-line bg-paper px-3 py-2"
            style={{ fontSize: 11.5 }}
          />
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
            disabled={pending}
            onClick={handleConfirm}
            className="rounded-md bg-success px-4 py-1.5 text-white disabled:opacity-40"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {pending ? "Reactivando…" : "Reactivar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
