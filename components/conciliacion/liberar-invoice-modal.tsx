"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { releaseInvoiceForPayment } from "@/lib/invoice-release-actions";
import { formatFull } from "@/lib/format";

const MIN_MOTIVO_LENGTH = 10;

export function LiberarInvoiceModal({
  open,
  onClose,
  numFactura,
  proveedor,
  valor,
  invoiceKey,
}: {
  open: boolean;
  onClose: () => void;
  numFactura: string;
  proveedor: string;
  valor: number;
  invoiceKey: string;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isValid = motivo.trim().length >= MIN_MOTIVO_LENGTH;

  function handleClose() {
    setMotivo("");
    setError(null);
    onClose();
  }

  function handleConfirm() {
    if (!isValid) return;
    startTransition(async () => {
      setError(null);
      const result = await releaseInvoiceForPayment(invoiceKey, motivo);
      if (result.ok) {
        handleClose();
        router.refresh();
      } else {
        setError(result.error ?? "No se pudo habilitar la factura.");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Habilitar factura para pago" width={460}>
      <div className="flex flex-col gap-3">
        <p className="text-stone" style={{ fontSize: 10 }}>
          Factura: {numFactura} · {proveedor} · {formatFull(valor)}
        </p>

        <div
          className="rounded-md px-3.5 py-2.5"
          style={{ background: "var(--color-cream-soft)", borderLeft: "3px solid var(--color-yellow)" }}
        >
          <p style={{ fontSize: 10.5 }}>
            Esta factura no aparece hoy en Mesa de Pagos porque el proveedor no es de categoría estratégico/locativo.
            Al habilitarla, quedará disponible para armar un lote y pagarla, sin cambiar la categoría del proveedor.
          </p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-semibold text-ink" style={{ fontSize: 11 }}>
            Motivo *
          </span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ej: El correo nunca llegó, factura confirmada directamente con el proveedor."
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
          <button type="button" onClick={handleClose} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isValid || pending}
            onClick={handleConfirm}
            className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {pending ? "Habilitando…" : "Habilitar para pago"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
