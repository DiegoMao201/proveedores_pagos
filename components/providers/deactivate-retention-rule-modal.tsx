"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { deactivateRetentionRule } from "@/lib/retention-rule-actions";
import type { RetentionRuleFull } from "@/lib/retention-rule-data";

export function DeactivateRetentionRuleModal({ providerId, rule }: { providerId: number; rule: RetentionRuleFull }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deactivateRetentionRule(rule.id, providerId, motivo);
        showToast({ kind: "success", message: "Regla desactivada. Aplica a facturas nuevas desde mañana." });
        setOpen(false);
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo desactivar." });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md border border-red px-2.5 py-1 text-red-deep"
        style={{ fontSize: 10, fontWeight: 700 }}
      >
        <Ban size={11} /> Desactivar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="¿Desactivar esta retención?" width={440}>
        <div className="flex flex-col gap-3">
          <p className="text-stone" style={{ fontSize: 11 }}>
            Regla: <strong className="text-ink">{rule.nombre_regla ?? `${rule.tipo_retencion} ${(rule.tasa * 100).toFixed(2)}%`}</strong>
          </p>
          <div className="rounded-md border border-yellow bg-cream-soft px-3 py-2" style={{ fontSize: 10.5 }}>
            Facturas emitidas hasta hoy seguirán usando esta regla (versionado estricto). Solo dejará de aplicar a
            facturas nuevas.
          </div>
          <textarea
            placeholder="Motivo de desactivación (opcional, queda en audit trail)"
            className="rounded-md border border-line bg-paper px-2.5 py-1.5 text-ink outline-none"
            style={{ fontSize: 11 }}
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleConfirm}
              className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
              style={{ fontSize: 11, fontWeight: 800 }}
            >
              {pending ? "Desactivando…" : "Desactivar regla"}
            </button>
          </div>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
