"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Merge, X } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { humanizeProviderName } from "@/lib/format";
import { mergeProviders, dismissDuplicate } from "@/lib/duplicate-providers-actions";
import type { PosibleDuplicadoRow } from "@/lib/duplicate-providers-data";

function ProviderSide({
  nombre,
  categoria,
  nif,
  facturas,
  tieneCuenta,
  id,
  onKeep,
  disabled,
}: {
  nombre: string;
  categoria: string | null;
  nif: string | null;
  facturas: number;
  tieneCuenta: boolean;
  id: number;
  onKeep: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-md border border-line bg-paper p-3">
      <Link href={`/proveedores/${id}`} className="font-semibold text-ink hover:text-red-deep" style={{ fontSize: 12.5 }}>
        {humanizeProviderName(nombre)}
      </Link>
      <p className="text-stone" style={{ fontSize: 10.5 }}>
        {categoria ?? "—"} · NIT {nif ?? "sin NIT"}
      </p>
      <p className="text-stone" style={{ fontSize: 10.5 }}>
        {facturas} facturas históricas · {tieneCuenta ? "con cuenta bancaria" : "sin cuenta bancaria"}
      </p>
      <button
        type="button"
        onClick={onKeep}
        disabled={disabled}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-line px-2 py-1.5 text-graphite hover:border-success hover:text-success disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontSize: 10.5, fontWeight: 700 }}
      >
        <Merge size={12} /> Conservar este
      </button>
    </div>
  );
}

export function DuplicadosTable({ rows }: { rows: PosibleDuplicadoRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  function handleMerge(keeperId: number, duplicateId: number, keeperNombre: string, duplicateNombre: string) {
    if (
      !window.confirm(
        `¿Fusionar "${humanizeProviderName(duplicateNombre)}" dentro de "${humanizeProviderName(keeperNombre)}"?\n\nSe migran cuenta bancaria, descuentos, retenciones y contactos que no choquen con los que ya tiene "${humanizeProviderName(keeperNombre)}", y "${humanizeProviderName(duplicateNombre)}" queda inactivo permanentemente.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await mergeProviders(keeperId, duplicateId);
      if (result.ok) {
        const conflictos = result.conflictos ?? [];
        showToast({
          kind: conflictos.length > 0 ? "warning" : "success",
          message: conflictos.length > 0 ? `Fusionados con avisos: ${conflictos.join(" · ")}` : "Proveedores fusionados correctamente.",
        });
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudo fusionar." });
      }
    });
  }

  function handleDismiss(id1: number, id2: number) {
    const motivo = window.prompt("¿Por qué no son el mismo proveedor? (opcional)") ?? "";
    startTransition(async () => {
      const result = await dismissDuplicate(id1, id2, motivo);
      if (result.ok) {
        showToast({ kind: "success", message: "Marcado como no duplicado." });
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudo descartar." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="px-1 text-stone" style={{ fontSize: 10.5 }}>
        Proveedores activos con nombre muy parecido o el mismo NIT — probablemente el mismo proveedor creado dos veces. Elige cuál se
        conserva (normalmente el que ya tiene historial real de facturas) o márcalo como "no es duplicado" si en verdad son distintos.
      </p>
      {rows.map((row) => (
        <div key={`${row.proveedor_id_1}-${row.proveedor_id_2}`} className="flex items-stretch gap-2 rounded-lg border border-line bg-cream-soft p-3">
          <ProviderSide
            id={row.proveedor_id_1}
            nombre={row.nombre_1}
            categoria={row.categoria_1}
            nif={row.nif_1}
            facturas={row.facturas_1}
            tieneCuenta={row.tiene_cuenta_1}
            disabled={pending}
            onKeep={() => handleMerge(row.proveedor_id_1, row.proveedor_id_2, row.nombre_1, row.nombre_2)}
          />
          <div className="flex flex-col items-center justify-center gap-1 px-1">
            <span className="text-stone" style={{ fontSize: 9.5 }}>
              {row.mismo_nif ? "mismo NIT" : `${Math.round(row.similitud * 100)}% similar`}
            </span>
            <button
              type="button"
              onClick={() => handleDismiss(row.proveedor_id_1, row.proveedor_id_2)}
              disabled={pending}
              className="flex items-center gap-1 text-stone hover:text-red-deep disabled:opacity-40"
              style={{ fontSize: 9.5, fontWeight: 700 }}
              title="No es duplicado"
            >
              <X size={11} /> no es duplicado
            </button>
          </div>
          <ProviderSide
            id={row.proveedor_id_2}
            nombre={row.nombre_2}
            categoria={row.categoria_2}
            nif={row.nif_2}
            facturas={row.facturas_2}
            tieneCuenta={row.tiene_cuenta_2}
            disabled={pending}
            onKeep={() => handleMerge(row.proveedor_id_2, row.proveedor_id_1, row.nombre_2, row.nombre_1)}
          />
        </div>
      ))}
      <Toast toast={toast} />
    </div>
  );
}
