"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";

export function NotasCreditoExportButton({ disabled }: { disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const { toast, showToast } = useToast();

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/notas-credito/export");
      if (!res.ok) {
        showToast({ kind: "error", message: "No se pudo generar el Excel de notas crédito." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="(.+)"/.exec(disposition);
      a.download = match?.[1] ?? "Notas_Credito_Estrategicos.xlsx";
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
        disabled={disabled || loading}
        className="flex items-center gap-1.5 rounded-lg bg-red-deep px-3 py-2 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontSize: 11.5 }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        Descargar Excel
      </button>
      <Toast toast={toast} />
    </>
  );
}
