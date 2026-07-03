"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Toast, useToast } from "@/components/ui/toast";
import { updateAutoretenedor } from "@/lib/retention-rule-actions";

export function AutoretenedorSwitch({ providerId, initialValue, canEdit }: { providerId: number; initialValue: boolean; canEdit: boolean }) {
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  function handleToggle() {
    if (!canEdit) return;
    const next = !value;
    setValue(next);
    startTransition(async () => {
      try {
        await updateAutoretenedor(providerId, next);
        showToast({ kind: "success", message: "Guardado. Este cambio aplica solo a facturas emitidas desde hoy." });
        router.refresh();
      } catch (e) {
        setValue(!next);
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo guardar." });
      }
    });
  }

  return (
    <Card className="border-yellow bg-cream-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-graphite" style={{ fontSize: 12, fontWeight: 700 }}>
            ¿Es autoretenedor este proveedor?
          </p>
          <p className="text-stone" style={{ fontSize: 10.5 }}>
            Si sí, no aplicaremos retención en la fuente.
          </p>
        </div>
        <button
          type="button"
          disabled={!canEdit || pending}
          onClick={handleToggle}
          className="relative shrink-0 rounded-full transition-colors disabled:opacity-50"
          style={{ width: 40, height: 22, background: value ? "var(--color-red-deep)" : "var(--color-line)" }}
        >
          <span
            className="absolute rounded-full bg-white transition-transform"
            style={{ width: 16, height: 16, top: 3, left: 3, transform: value ? "translateX(18px)" : "translateX(0)" }}
          />
        </button>
      </div>
      {value && (
        <p className="mt-2 text-graphite" style={{ fontSize: 10.5, borderTop: "1px solid var(--color-line)", paddingTop: 8 }}>
          Este proveedor está marcado como autoretenedor. Las reglas de tipo &quot;fuente&quot; no se aplicarán al calcular
          pagos.
        </p>
      )}
      <Toast toast={toast} />
    </Card>
  );
}
