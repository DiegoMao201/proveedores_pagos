"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { humanizeProviderName } from "@/lib/format";
import { getProvidersForAdd } from "@/lib/lotes-actions";
import type { ProviderRow } from "@/lib/provider-detail-data";

export function AddProviderModal({
  open,
  onClose,
  excludeIds,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  excludeIds: number[];
  onPick: (provider: { id: number; nombre: string }) => void;
}) {
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setLoading(true);
    getProvidersForAdd(excludeIds)
      .then(setProviders)
      .catch(() => showToast({ kind: "error", message: "No se pudo cargar la lista de proveedores." }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? providers.filter((p) => humanizeProviderName(p.nombre).toLowerCase().includes(q) || p.nif?.toLowerCase().includes(q))
    : providers;

  return (
    <Modal open={open} onClose={onClose} title="Agregar proveedor al lote">
      <div className="flex flex-col gap-3">
        <input
          type="text"
          autoFocus
          placeholder="Buscar proveedor por nombre o NIT…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-md border border-line bg-paper px-3 py-2"
          style={{ fontSize: 13 }}
        />
        <div className="flex max-h-96 flex-col overflow-y-auto rounded-md border border-line">
          {loading && <p className="p-4 text-center text-stone" style={{ fontSize: 12 }}>Cargando proveedores…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-center text-stone" style={{ fontSize: 12 }}>No se encontraron proveedores.</p>
          )}
          {!loading &&
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick({ id: p.id, nombre: p.nombre })}
                className="flex items-center justify-between border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-cream-soft"
              >
                <span className="font-semibold text-ink" style={{ fontSize: 12.5 }}>{humanizeProviderName(p.nombre)}</span>
                <span className="text-stone" style={{ fontSize: 10.5 }}>{p.nif ?? "sin NIT"}</span>
              </button>
            ))}
        </div>
      </div>
      <Toast toast={toast} />
    </Modal>
  );
}
