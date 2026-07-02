"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { Toast, useToast } from "@/components/ui/toast";
import { updateProviderBasics } from "@/lib/provider-actions";
import type { ProviderFull } from "@/lib/provider-detail-data";

const CATEGORIAS = [
  { value: "estrategico", label: "Estratégico" },
  { value: "operativo", label: "Operativo" },
  { value: "locativo", label: "Locativo" },
  { value: "esporadico", label: "Esporádico" },
  { value: "institucional", label: "Institucional" },
];

export function EditableBasicsForm({ provider, canEdit }: { provider: ProviderFull; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [nombre, setNombre] = useState(provider.nombre);
  const [nif, setNif] = useState(provider.nif ?? "");
  const [categoria, setCategoria] = useState(provider.categoria_proveedor ?? "");
  const [observaciones, setObservaciones] = useState(provider.observaciones ?? "");
  const [activo, setActivo] = useState(provider.activo);

  function reset() {
    setNombre(provider.nombre);
    setNif(provider.nif ?? "");
    setCategoria(provider.categoria_proveedor ?? "");
    setObservaciones(provider.observaciones ?? "");
    setActivo(provider.activo);
    setEditing(false);
  }

  function save() {
    startTransition(async () => {
      try {
        await updateProviderBasics(provider.id, {
          nombre,
          nif: nif || null,
          categoria_proveedor: categoria || null,
          observaciones: observaciones || null,
          activo,
        });
        showToast({ kind: "success", message: "Datos básicos actualizados." });
        setEditing(false);
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo guardar." });
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12 }}>
          Datos básicos
        </h2>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-red-deep"
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Nombre display">
          <input disabled={!editing} className={inputClassName(!editing)} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </FormField>
        <FormField label="NIT">
          <input disabled={!editing} className={inputClassName(!editing)} value={nif} onChange={(e) => setNif(e.target.value)} />
        </FormField>
        <FormField label="Categoría">
          <select disabled={!editing} className={inputClassName(!editing)} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Sin categoría</option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Activo">
          <label className="flex items-center gap-2 py-1.5">
            <input type="checkbox" disabled={!editing} checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            <span className="text-graphite" style={{ fontSize: 12 }}>
              {activo ? "Sí" : "No"}
            </span>
          </label>
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Notas operativas">
            <textarea
              disabled={!editing}
              className={inputClassName(!editing)}
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </FormField>
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="button" onClick={reset} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
            Deshacer
          </button>
        </div>
      )}
      <Toast toast={toast} />
    </Card>
  );
}
