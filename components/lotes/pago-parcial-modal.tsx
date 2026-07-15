"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { applyPartialPayment } from "@/lib/lotes-actions";
import { formatFull } from "@/lib/format";

const MIN_MOTIVO_LENGTH = 10;

export function PagoParcialModal({
  open,
  onClose,
  batchId,
  itemId,
  codigoLote,
  numFactura,
  valorNeto,
}: {
  open: boolean;
  onClose: () => void;
  batchId: number;
  itemId: number;
  codigoLote: string;
  numFactura: string;
  valorNeto: number;
}) {
  const router = useRouter();
  const [valorPagado, setValorPagado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const valor = Number(valorPagado);
  const isValidValor = Number.isFinite(valor) && valor > 0 && valor < valorNeto;
  const isValidMotivo = motivo.trim().length >= MIN_MOTIVO_LENGTH;
  const isValid = isValidValor && isValidMotivo;
  const saldoPendiente = isValidValor ? valorNeto - valor : null;

  function handleClose() {
    setValorPagado("");
    setMotivo("");
    setError(null);
    onClose();
  }

  function handleConfirm() {
    if (!isValid) return;
    startTransition(async () => {
      setError(null);
      const result = await applyPartialPayment(batchId, itemId, valor, motivo, codigoLote);
      if (result.ok) {
        handleClose();
        router.refresh();
      } else {
        setError(result.error ?? "No se pudo aplicar el pago parcial.");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Pago parcial de factura" width={460}>
      <div className="flex flex-col gap-3">
        <p className="text-stone" style={{ fontSize: 10 }}>
          Factura: {numFactura} · Neto completo: {formatFull(valorNeto)}
        </p>

        <div className="rounded-md px-3.5 py-2.5" style={{ background: "var(--color-cream-soft)", borderLeft: "3px solid var(--color-yellow)" }}>
          <p style={{ fontSize: 10.5 }}>
            El saldo restante queda pendiente para un lote futuro — no vuelve a estar disponible hasta que tu ERP
            confirme el saldo reducido en su próxima sincronización.
          </p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-semibold text-ink" style={{ fontSize: 11 }}>Valor a pagar ahora *</span>
          <input
            type="number"
            value={valorPagado}
            onChange={(e) => setValorPagado(e.target.value)}
            min={1}
            step="0.01"
            placeholder="0"
            className="rounded-md border border-line bg-paper px-3 py-2"
            style={{ fontSize: 13 }}
          />
          {valorPagado && !isValidValor && (
            <span className="text-red-deep" style={{ fontSize: 9.5 }}>Debe ser mayor a cero y menor al neto completo.</span>
          )}
          {saldoPendiente !== null && (
            <span className="text-stone" style={{ fontSize: 9.5 }}>Saldo pendiente: {formatFull(saldoPendiente)}</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-semibold text-ink" style={{ fontSize: 11 }}>Motivo *</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ej: El cliente solo consignó una parte, el resto queda para el próximo lote."
            className="rounded-md border border-line bg-paper px-3 py-2"
            style={{ fontSize: 11.5 }}
          />
          <span className={isValidMotivo ? "text-stone" : "text-red-deep"} style={{ fontSize: 9.5 }}>
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
            {pending ? "Aplicando…" : "Aplicar pago parcial"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
