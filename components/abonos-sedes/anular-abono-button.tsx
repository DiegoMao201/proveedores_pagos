"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { anularSedeAbono } from "@/lib/sede-abono-actions";

export function AnularAbonoButton({ abonoId }: { abonoId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  function handleConfirm() {
    startTransition(async () => {
      const result = await anularSedeAbono(abonoId, motivo);
      if (result.ok) {
        showToast({ kind: "success", message: "Abono anulado." });
        setOpen(false);
        setMotivo("");
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudo anular." });
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-stone hover:text-red-deep" title="Anular abono">
        <XCircle size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Anular abono" width={420}>
        <div className="flex flex-col gap-3">
          <p className="text-stone" style={{ fontSize: 11 }}>
            Úsalo solo si el abono se reportó por error (valor equivocado, duplicado, etc). No se puede deshacer.
          </p>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Motivo de la anulación"
            className="rounded-md border border-line bg-paper px-3 py-2"
            style={{ fontSize: 11.5 }}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
              Volver
            </button>
            <button
              type="button"
              disabled={pending || motivo.trim().length < 5}
              onClick={handleConfirm}
              className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
              style={{ fontSize: 11, fontWeight: 800 }}
            >
              {pending ? "Anulando…" : "Confirmar anulación"}
            </button>
          </div>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
