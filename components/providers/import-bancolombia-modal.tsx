"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { importBancolombiaAccounts, type BancolombiaImportRow } from "@/lib/provider-actions";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < rawLine.length; i++) {
      const ch = rawLine[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

function toRows(csvRows: string[][]): BancolombiaImportRow[] {
  const [, ...dataRows] = csvRows;
  return dataRows
    .filter((r) => r[0]?.trim())
    .map((r) => ({
      numero_cuenta: r[0].trim(),
      tipo_cuenta_bancolombia: Number(r[1]),
      nombre_personalizado: r[2].trim(),
      banco_codigo: Number(r[3]),
      numero_documento_tercero: r[4].trim(),
      tipo_documento_tercero: Number(r[5]),
      validacion_titularidad: r[6]?.trim() || null,
      tope_pago_dia: r[12] ? Number(r[12]) : null,
    }));
}

export function ImportBancolombiaModal() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<BancolombiaImportRow[]>([]);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();
  const router = useRouter();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = toRows(parseCsv(text));
      setPreview(rows);
    };
    reader.readAsText(file, "utf-8");
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const { imported, total } = await importBancolombiaAccounts(preview);
        showToast({ kind: "success", message: `Importadas ${imported} filas. Total en catálogo: ${total}.` });
        setOpen(false);
        setPreview([]);
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo importar el archivo." });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-graphite transition-colors hover:border-red"
        style={{ fontSize: 12, fontWeight: 700 }}
      >
        <UploadCloud size={14} />
        Importar cuentas Bancolombia
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Importar cuentas inscritas Bancolombia" width={640}>
        <div className="flex flex-col gap-3">
          <p className="text-stone" style={{ fontSize: 11 }}>
            Sube el CSV exportado de Bancolombia (&quot;Cuentas inscritas para pagos&quot;). Se agregan al catálogo de referencia
            sin duplicar cuentas ya existentes (número de cuenta + banco).
          </p>
          <input type="file" accept=".csv" onChange={handleFile} className="text-stone" style={{ fontSize: 11 }} />

          {preview.length > 0 && (
            <>
              <p className="text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
                Vista previa ({preview.length} filas detectadas, primeras 10):
              </p>
              <div className="max-h-56 overflow-y-auto rounded-md border border-line">
                <table className="w-full" style={{ fontSize: 10 }}>
                  <thead>
                    <tr className="border-b border-line bg-parchment text-stone">
                      <th className="px-2 py-1 text-left">Cuenta</th>
                      <th className="px-2 py-1 text-left">Nombre</th>
                      <th className="px-2 py-1 text-left">Banco</th>
                      <th className="px-2 py-1 text-left">NIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        <td className="px-2 py-1">{r.numero_cuenta}</td>
                        <td className="px-2 py-1">{r.nombre_personalizado}</td>
                        <td className="px-2 py-1">{r.banco_codigo}</td>
                        <td className="px-2 py-1">{r.numero_documento_tercero}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={handleConfirm}
                className="self-end rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
                style={{ fontSize: 11, fontWeight: 800 }}
              >
                {pending ? "Importando…" : `Confirmar import (${preview.length} filas)`}
              </button>
            </>
          )}
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
