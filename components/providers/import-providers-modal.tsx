"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Download } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { bulkImportProviders, type ProviderImportRow } from "@/lib/provider-actions";

interface PreviewRow extends ProviderImportRow {
  errores: string[];
  omitida: boolean;
}

async function downloadTemplate() {
  const res = await fetch("/api/proveedores/import/template");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Plantilla_Importacion_Proveedores.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportProvidersModal() {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();
  const router = useRouter();

  function reset() {
    setRows(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setRows(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/proveedores/import/parse", { method: "POST", body: formData });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        showToast({ kind: "error", message: body.error === "HOJA_PROVEEDORES_NO_ENCONTRADA"
          ? "El archivo no tiene una hoja llamada \"Proveedores\" — usa la plantilla sin renombrar las hojas."
          : "No se pudo leer el archivo. Verifica que sea el formato de la plantilla." });
        return;
      }
      const body = (await res.json()) as { rows: PreviewRow[] };
      setRows(body.rows);
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  function handleConfirm() {
    if (!rows) return;
    const validas = rows.filter((r) => !r.omitida && r.errores.length === 0);
    startTransition(async () => {
      try {
        const { creados, actualizados, errores } = await bulkImportProviders(
          validas.map(({ errores: _e, omitida: _o, ...rest }) => rest)
        );
        showToast({
          kind: errores.length > 0 ? "warning" : "success",
          message:
            `${creados} proveedores creados, ${actualizados} actualizados.` +
            (errores.length > 0 ? ` ${errores.length} fallaron: ${errores.map((e) => `fila ${e.rowNumber}`).join(", ")}` : ""),
        });
        setOpen(false);
        reset();
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo importar." });
      }
    });
  }

  const validas = rows?.filter((r) => !r.omitida && r.errores.length === 0) ?? [];
  const aCrear = validas.filter((r) => r.accion === "crear").length;
  const aActualizar = validas.filter((r) => r.accion === "actualizar").length;
  const conError = rows?.filter((r) => !r.omitida && r.errores.length > 0) ?? [];
  const omitidas = rows?.filter((r) => r.omitida).length ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-graphite transition-colors hover:border-red"
        style={{ fontSize: 12, fontWeight: 700 }}
      >
        <UploadCloud size={14} />
        Importar proveedores en masa
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Importar proveedores en masa"
        width={760}
      >
        <div className="flex flex-col gap-3">
          <p className="text-stone" style={{ fontSize: 11 }}>
            Descarga la plantilla, complétala con tus proveedores y súbela aquí. Podrás revisar exactamente qué se va a
            crear y qué se va a actualizar antes de confirmar — nada se guarda hasta que lo confirmes.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-graphite"
              style={{ fontSize: 11.5, fontWeight: 700 }}
            >
              <Download size={13} /> Descargar plantilla Excel
            </button>
            <input type="file" accept=".xlsx" onChange={handleFile} className="text-stone" style={{ fontSize: 11 }} />
          </div>

          {parsing && <p className="text-stone" style={{ fontSize: 11 }}>Leyendo archivo…</p>}

          {rows && rows.length === 0 && (
            <p className="text-stone" style={{ fontSize: 11 }}>No se encontraron filas con datos en la hoja &quot;Proveedores&quot;.</p>
          )}

          {rows && rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-success/10 px-2.5 py-1 font-semibold text-success" style={{ fontSize: 10.5 }}>
                  {aCrear} nuevos
                </span>
                <span className="rounded-full bg-cream px-2.5 py-1 font-semibold text-orange" style={{ fontSize: 10.5 }}>
                  {aActualizar} a actualizar
                </span>
                {conError.length > 0 && (
                  <span className="rounded-full bg-red-deep/10 px-2.5 py-1 font-semibold text-red-deep" style={{ fontSize: 10.5 }}>
                    {conError.length} con errores (no se importarán)
                  </span>
                )}
                {omitidas > 0 && (
                  <span className="rounded-full bg-line-soft px-2.5 py-1 font-semibold text-graphite" style={{ fontSize: 10.5 }}>
                    {omitidas} fila(s) de ejemplo omitida(s)
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border border-line">
                <table className="w-full" style={{ fontSize: 10.5 }}>
                  <thead className="sticky top-0 bg-parchment">
                    <tr className="border-b border-line text-stone">
                      <th className="px-2 py-1.5 text-left">Fila</th>
                      <th className="px-2 py-1.5 text-left">Nombre</th>
                      <th className="px-2 py-1.5 text-left">NIT</th>
                      <th className="px-2 py-1.5 text-left">Acción</th>
                      <th className="px-2 py-1.5 text-left">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .filter((r) => !r.omitida)
                      .map((r) => (
                        <tr key={r.rowNumber} className="border-b border-line last:border-0">
                          <td className="px-2 py-1.5 text-stone">{r.rowNumber}</td>
                          <td className="px-2 py-1.5 text-ink">{r.nombre || "—"}</td>
                          <td className="px-2 py-1.5 text-stone">{r.nif || "—"}</td>
                          <td className="px-2 py-1.5">
                            {r.errores.length > 0 ? (
                              <span className="font-semibold text-red-deep">Error</span>
                            ) : r.accion === "crear" ? (
                              <span className="font-semibold text-success">Crear</span>
                            ) : (
                              <span className="font-semibold text-orange">Actualizar</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-stone">
                            {r.errores.length > 0 ? r.errores.join(" · ") : r.accion === "actualizar" ? `Coincide con proveedor #${r.proveedor_id}` : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                disabled={pending || validas.length === 0}
                onClick={handleConfirm}
                className="self-end rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
                style={{ fontSize: 11, fontWeight: 800 }}
              >
                {pending ? "Importando…" : `Confirmar importación (${validas.length} filas)`}
              </button>
            </>
          )}
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
