"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Toast, useToast } from "@/components/ui/toast";
import { formatFull, humanizeProviderName } from "@/lib/format";
import type { BatchProviderBreakdownRow } from "@/lib/lotes-data";

interface NotifyResult {
  proveedor: string;
  estado: "enviado" | "error";
  error?: string;
}

export function NotificarForm({ codigoLote, breakdown }: { codigoLote: string; breakdown: BatchProviderBreakdownRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set(breakdown.filter((b) => b.email_pago).map((b) => b.proveedor_id)));
  const [modoPrueba, setModoPrueba] = useState(true);
  const [results, setResults] = useState<NotifyResult[] | null>(null);

  function toggle(providerId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  }

  function handleSend() {
    startTransition(async () => {
      const res = await fetch(`/api/lotes/${codigoLote}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedorIds: Array.from(selected), modoPrueba }),
      });
      const body = (await res.json().catch(() => ({}))) as { results?: NotifyResult[]; error?: string };
      if (!res.ok) {
        showToast({ kind: "error", message: body.error ?? "No se pudieron enviar los correos." });
        return;
      }
      setResults(body.results ?? []);
      const errores = (body.results ?? []).filter((r) => r.estado === "error").length;
      if (errores === 0) {
        showToast({ kind: "success", message: `${(body.results ?? []).length} correo(s) enviado(s).` });
      } else {
        showToast({ kind: "error", message: `${errores} correo(s) con error. Revisa el detalle.` });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-parchment text-left text-xs font-semibold uppercase tracking-wide text-stone">
            <tr>
              <th className="px-3 py-3" style={{ width: 24 }}></th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3 text-right">Facturas</th>
              <th className="px-4 py-3 text-right">Neto</th>
              <th className="px-4 py-3">Email destino</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b) => {
              const hasEmail = !!b.email_pago;
              return (
                <tr key={b.proveedor_id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(b.proveedor_id)}
                      disabled={!hasEmail}
                      onChange={() => toggle(b.proveedor_id)}
                      style={{ width: 14, height: 14, accentColor: "var(--color-red-deep)" }}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{humanizeProviderName(b.proveedor_nombre)}</td>
                  <td className="num px-4 py-3 text-right">{b.num_facturas}</td>
                  <td className="num px-4 py-3 text-right font-semibold">{formatFull(b.total_neto)}</td>
                  <td className="px-4 py-3" style={{ fontSize: 11 }}>
                    {hasEmail ? <span className="text-stone">{b.email_pago}</span> : <span className="text-orange">⚠ Sin email — no se enviará</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card style={{ background: "var(--color-cream-soft)", border: "2px solid var(--color-yellow)" }}>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={modoPrueba} onChange={(e) => setModoPrueba(e.target.checked)} style={{ width: 15, height: 15, marginTop: 2 }} />
          <div>
            <p className="text-ink" style={{ fontSize: 12, fontWeight: 700 }}>Modo prueba — enviar todos los correos a compras@ferreinox.co</p>
            <p className="text-stone" style={{ fontSize: 10.5 }}>
              Recomendado para el primer envío. Valida el template y el filtrado por proveedor antes de enviar a proveedores reales.
            </p>
          </div>
        </label>
      </Card>

      {results && (
        <Card>
          <p className="text-ink" style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Resultado del envío</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {results.map((r, i) => (
              <p key={i} style={{ fontSize: 11 }} className={r.estado === "enviado" ? "text-success" : "text-red-deep"}>
                {r.estado === "enviado" ? "✓" : "✗"} {humanizeProviderName(r.proveedor)}{r.error ? ` — ${r.error}` : ""}
              </p>
            ))}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-end gap-2">
        {!modoPrueba && (
          <p className="flex items-center gap-1 text-orange" style={{ fontSize: 10.5 }}>
            <AlertTriangle size={12} /> Envío real — llegará a los proveedores.
          </p>
        )}
        <button
          type="button"
          disabled={pending || selected.size === 0}
          onClick={handleSend}
          className="flex items-center gap-1.5 rounded-md bg-red-deep px-4 py-2 text-white disabled:opacity-40"
          style={{ fontSize: 12, fontWeight: 800 }}
        >
          <Send size={14} /> {pending ? "Enviando…" : `Enviar ${selected.size} correo${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
