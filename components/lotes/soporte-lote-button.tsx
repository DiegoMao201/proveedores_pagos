"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";

export function SoporteLoteButton({ codigoLote }: { codigoLote: string }) {
  const [loading, setLoading] = useState(false);
  const { toast, showToast } = useToast();

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/lotes/${codigoLote}/export-soporte`);
      if (!res.ok) {
        showToast({ kind: "error", message: "No se pudo generar el Excel de soporte del lote." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="(.+)"/.exec(disposition);
      a.download = match?.[1] ?? `Soporte_${codigoLote}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-graphite transition-colors hover:border-red-deep disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontSize: 12, fontWeight: 700 }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
        Descargar Excel de soporte
      </button>
      <Toast toast={toast} />
    </>
  );
}
