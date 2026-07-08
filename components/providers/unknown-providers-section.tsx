"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { Toast, useToast } from "@/components/ui/toast";
import { quickOnboardProvider } from "@/lib/provider-actions";
import { formatFull, formatDateEs, humanizeProviderName } from "@/lib/format";
import type { UnknownProviderRow } from "@/lib/bank-account-data";

const CATEGORIAS = [
  { value: "estrategico", label: "Estratégico" },
  { value: "operativo", label: "Operativo" },
  { value: "locativo", label: "Locativo" },
  { value: "esporadico", label: "Esporádico" },
  { value: "institucional", label: "Institucional" },
];

function OnboardModal({ row, onClose }: { row: UnknownProviderRow; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [nombre, setNombre] = useState(humanizeProviderName(row.nombre_proveedor_erp));
  const [categoria, setCategoria] = useState("locativo");
  const [nif, setNif] = useState("");
  const [esAutoretenedor, setEsAutoretenedor] = useState(false);

  function handleSubmit() {
    startTransition(async () => {
      try {
        await quickOnboardProvider({
          nombreErp: row.nombre_proveedor_erp,
          nombre,
          categoria_proveedor: categoria,
          nif: nif || null,
          es_autoretenedor: esAutoretenedor,
        });
        showToast({ kind: "success", message: `${nombre} dado de alta — ya debería verse en la app.` });
        onClose();
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo dar de alta." });
      }
    });
  }

  return (
    <>
      <Modal open onClose={onClose} title="Dar de alta proveedor" width={480}>
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-line bg-parchment p-3" style={{ fontSize: 11 }}>
            <p className="text-stone">
              Nombre en ERP: <span className="font-semibold text-ink">{row.nombre_proveedor_erp}</span>
            </p>
            <p className="text-stone">
              {row.docs_en_cartera} documentos en cartera · {formatFull(row.pendiente_total)} pendiente
            </p>
          </div>

          <FormField label="Nombre principal">
            <input className={inputClassName(false)} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </FormField>
          <FormField label="Categoría">
            <select className={inputClassName(false)} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="NIT (opcional)">
            <input className={inputClassName(false)} value={nif} onChange={(e) => setNif(e.target.value)} placeholder="900123456" />
          </FormField>
          <FormField label="¿Es autoretenedor?">
            <label className="flex items-center gap-2 py-1.5">
              <input type="checkbox" checked={esAutoretenedor} onChange={(e) => setEsAutoretenedor(e.target.checked)} />
              <span className="text-graphite" style={{ fontSize: 12 }}>
                {esAutoretenedor ? "Sí" : "No"}
              </span>
            </label>
          </FormField>

          <div className="mt-1 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending || !nombre.trim()}
              onClick={handleSubmit}
              className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
              style={{ fontSize: 11, fontWeight: 800 }}
            >
              {pending ? "Guardando…" : "Dar de alta"}
            </button>
          </div>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}

export function UnknownProvidersSection({ rows }: { rows: UnknownProviderRow[] }) {
  const [onboarding, setOnboarding] = useState<UnknownProviderRow | null>(null);

  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.pendiente_total, 0);

  return (
    <div id="desconocidos">
      <Card style={{ background: "var(--color-cream-soft)", borderLeft: "4px solid var(--color-orange)" }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-orange" />
          <div>
            <p className="text-ink" style={{ fontSize: 13, fontWeight: 800 }}>
              {rows.length} proveedores en cartera sin registrar
            </p>
            <p className="text-stone" style={{ fontSize: 10 }}>
              Aparecen en el CSV del ERP pero no están en el catálogo — {formatFull(total)} pendiente en total. Decide si darlos de alta.
            </p>
          </div>
        </div>

        <div className="mt-2.5 overflow-x-auto rounded-md border border-line bg-paper">
          <table className="w-full" style={{ fontSize: 11 }}>
            <thead>
              <tr className="border-b border-line bg-parchment text-stone" style={{ fontSize: 9, textTransform: "uppercase" }}>
                <th className="px-3 py-2 text-left">Proveedor (ERP)</th>
                <th className="px-3 py-2 text-right">Docs</th>
                <th className="px-3 py-2 text-right">Pendiente</th>
                <th className="px-3 py-2 text-left">Primera aparición</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.nombre_proveedor_erp} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink">{r.nombre_proveedor_erp}</td>
                  <td className="num px-3 py-2 text-right">{r.docs_en_cartera}</td>
                  <td className="num px-3 py-2 text-right" style={{ fontWeight: 700 }}>{formatFull(r.pendiente_total)}</td>
                  <td className="px-3 py-2 text-stone">{r.primera_fecha ? formatDateEs(r.primera_fecha) : "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setOnboarding(r)}
                      className="font-semibold text-red-deep"
                      style={{ fontSize: 10.5 }}
                    >
                      Dar de alta →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {onboarding && <OnboardModal row={onboarding} onClose={() => setOnboarding(null)} />}
    </div>
  );
}
