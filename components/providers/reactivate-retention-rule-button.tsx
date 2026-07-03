"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { reactivateRetentionRule } from "@/lib/retention-rule-actions";

export function ReactivateRetentionRuleButton({ ruleId, providerId }: { ruleId: number; providerId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  function handleClick() {
    startTransition(async () => {
      try {
        await reactivateRetentionRule(ruleId, providerId);
        showToast({ kind: "success", message: "Regla reactivada desde hoy." });
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo reactivar." });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-graphite disabled:opacity-40"
        style={{ fontSize: 10, fontWeight: 700 }}
      >
        <RotateCcw size={11} /> Reactivar
      </button>
      <Toast toast={toast} />
    </>
  );
}
