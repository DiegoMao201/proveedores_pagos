"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, AlertTriangle, Download, XCircle, CheckCircle2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { formatFull, formatDateEs, formatDateRelative, humanizeProviderName } from "@/lib/format";
import { markBatchPaid, cancelBatch } from "@/lib/lotes-actions";
import type { BatchSummaryRow } from "@/lib/batch-data";
import type { BatchProviderBreakdownRow, BatchItemDetailRow, BatchAuditLogRow, BatchDiscrepancyRow } from "@/lib/lotes-data";

const ESTADO_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: "Borrador", bg: "var(--color-cream-soft)", color: "var(--color-orange)" },
  exported: { label: "Exportado", bg: "var(--color-cream)", color: "var(--color-orange)" },
  paid: { label: "Pagado", bg: "var(--color-success-soft)", color: "var(--color-success)" },
  cancelled: { label: "Cancelado", bg: "var(--color-line-soft)", color: "var(--color-graphite)" },
};

const EVENT_LABELS: Record<string, string> = {
  BATCH_CREATED: "Lote creado",
  BATCH_EXPORTED: "PAB exportado",
  BATCH_MARKED_PAID: "Marcado como pagado",
  BATCH_CANCELLED: "Cancelado",
};

function ItemsTable({ items }: { items: BatchItemDetailRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ fontSize: 11 }}>
        <thead>
          <tr className="border-b border-line bg-parchment text-stone" style={{ fontSize: 9, textTransform: "uppercase" }}>
            <th className="px-3 py-2 text-left">Documento</th>
            <th className="px-3 py-2 text-left">Emisión</th>
            <th className="px-3 py-2 text-right">Bruto</th>
            <th className="px-3 py-2 text-right">Descuento</th>
            <th className="px-3 py-2 text-right">Retenciones</th>
            <th className="px-3 py-2 text-right">Neto</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const retencion = item.valor_retencion_fuente + item.valor_retencion_ica + item.valor_retencion_iva + item.valor_retencion_otros;
            const esNC = item.valor_bruto < 0;
            return (
              <tr key={item.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2" style={{ color: esNC ? "var(--color-red-deep)" : "var(--color-ink)", fontWeight: 600 }}>
                  {esNC ? "NC " : ""}{item.num_factura}
                </td>
                <td className="date px-3 py-2 text-stone">{item.fecha_emision ? formatDateEs(item.fecha_emision) : "—"}</td>
                <td className="num px-3 py-2 text-right">{formatFull(item.valor_bruto)}</td>
                <td className="num px-3 py-2 text-right text-success">{item.valor_descuento > 0 ? `−${formatFull(item.valor_descuento)}` : "—"}</td>
                <td className="num px-3 py-2 text-right text-orange">{retencion > 0 ? `−${formatFull(retencion)}` : "—"}</td>
                <td className="num px-3 py-2 text-right font-semibold">{formatFull(item.valor_neto)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CancelModal({ open, onClose, batchId, codigoLote }: { open: boolean; onClose: () => void; batchId: number; codigoLote: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  function handleConfirm() {
    startTransition(async () => {
      const result = await cancelBatch(batchId, codigoLote, reason);
      if (result.ok) {
        showToast({ kind: "success", message: "Lote cancelado." });
        onClose();
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudo cancelar." });
      }
    });
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Cancelar lote" width={440}>
        <div className="flex flex-col gap-3">
          <p className="text-stone" style={{ fontSize: 11 }}>Esta acción no se puede deshacer. Las facturas volverán a estar disponibles para armar en otro lote.</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Motivo de la cancelación"
            className="rounded-md border border-line bg-paper px-3 py-2"
            style={{ fontSize: 11.5 }}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
              Volver
            </button>
            <button
              type="button"
              disabled={pending || reason.trim().length < 5}
              onClick={handleConfirm}
              className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
              style={{ fontSize: 11, fontWeight: 800 }}
            >
              {pending ? "Cancelando…" : "Confirmar cancelación"}
            </button>
          </div>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}

export function LoteDetail({
  batch,
  breakdown,
  items,
  auditLog,
  discrepancy,
  canEdit,
}: {
  batch: BatchSummaryRow;
  breakdown: BatchProviderBreakdownRow[];
  items: BatchItemDetailRow[];
  auditLog: BatchAuditLogRow[];
  discrepancy: BatchDiscrepancyRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const { toast, showToast } = useToast();

  const estado = ESTADO_LABELS[batch.estado];
  const esMultiproveedor = batch.es_multiproveedor;

  function toggleCollapsed(providerId: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  }

  function handleExport() {
    startTransition(async () => {
      const res = await fetch(`/api/lotes/${batch.codigo_lote}/export-pab`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; proveedores_afectados?: string[] };
        const detalle = body.proveedores_afectados?.length ? `: ${body.proveedores_afectados.join(", ")}` : "";
        showToast({ kind: "error", message: `${body.error ?? "No se pudo exportar el PAB"}${detalle}` });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="(.+)"/.exec(disposition);
      a.download = match?.[1] ?? `PAB_${batch.codigo_lote}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ kind: "success", message: "PAB exportado." });
      router.refresh();
    });
  }

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markBatchPaid(batch.id, batch.codigo_lote);
      if (result.ok) {
        showToast({ kind: "success", message: "Lote marcado como pagado." });
        router.refresh();
      } else {
        showToast({ kind: "error", message: result.error ?? "No se pudo marcar como pagado." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="num text-ink" style={{ fontSize: 22, fontWeight: 900 }}>{batch.codigo_lote}</span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold" style={{ fontSize: 10, background: estado.bg, color: estado.color }}>
                {estado.label}
              </span>
            </div>
            <p className="text-stone" style={{ fontSize: 11.5, marginTop: 2 }}>
              {esMultiproveedor ? `Lote consolidado · ${breakdown.length} proveedores` : `Lote de ${humanizeProviderName(batch.proveedor_nombre ?? "")}`}
            </p>
            <p className="text-stone" style={{ fontSize: 10 }}>
              Creado por {batch.created_by_nombre ?? "—"} · {formatDateRelative(batch.created_at)}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <p className="text-stone" style={{ fontSize: 9, fontWeight: 700 }}>BRUTO</p>
              <p className="num text-ink" style={{ fontSize: 13, fontWeight: 700 }}>{formatFull(batch.valor_bruto)}</p>
            </div>
            <div>
              <p className="text-success" style={{ fontSize: 9, fontWeight: 700 }}>DESCUENTO</p>
              <p className="num text-success" style={{ fontSize: 13, fontWeight: 700 }}>−{formatFull(batch.valor_descuento)}</p>
            </div>
            <div>
              <p className="text-orange" style={{ fontSize: 9, fontWeight: 700 }}>RETENCIONES</p>
              <p className="num text-orange" style={{ fontSize: 13, fontWeight: 700 }}>−{formatFull(batch.valor_retencion)}</p>
            </div>
            <div>
              <p className="text-red-deep" style={{ fontSize: 9, fontWeight: 800 }}>NETO</p>
              <p className="num text-red-deep" style={{ fontSize: 16, fontWeight: 800 }}>{formatFull(batch.valor_neto)}</p>
            </div>
          </div>
        </div>
      </Card>

      {!esMultiproveedor && (
        <Card>
          <p className="text-ink" style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Cuenta débito y destino</p>
          <div className="mt-1.5 grid grid-cols-2 gap-3" style={{ fontSize: 11 }}>
            <div>
              <p className="text-stone" style={{ fontSize: 9 }}>Ferreinox debita</p>
              <p className="text-ink">{batch.banco_debito_nombre ?? "—"} · {batch.cuenta_debito ?? "—"}</p>
            </div>
            <div>
              <p className="text-stone" style={{ fontSize: 9 }}>Proveedor recibe</p>
              <p className="text-ink">{batch.banco_destino_nombre ?? "—"} · {batch.cuenta_destino ?? "—"}</p>
              <p className={batch.inscrita_bancolombia ? "text-success" : "text-orange"} style={{ fontSize: 10 }}>
                {batch.inscrita_bancolombia ? "✓ Inscrita en Bancolombia" : "⚠ No inscrita en Bancolombia"}
              </p>
            </div>
          </div>
          <p className="text-stone" style={{ fontSize: 10, marginTop: 6 }}>
            Descripción del pago: {batch.descripcion_pago} · Fecha programada: {formatDateEs(batch.fecha_pago_programada)}
          </p>
        </Card>
      )}
      {esMultiproveedor && (
        <Card>
          <p className="text-stone" style={{ fontSize: 10 }}>
            Ferreinox debita: {batch.banco_debito_nombre ?? "—"} · {batch.cuenta_debito ?? "—"} · Descripción: {batch.descripcion_pago} · Fecha programada: {formatDateEs(batch.fecha_pago_programada)}
          </p>
        </Card>
      )}

      {discrepancy.length > 0 && (
        <Card className={discrepancy.some((d) => d.nivel_alerta === "CRITICA") ? "border-red-deep bg-cream" : "border-orange"}>
          <p className="flex items-center gap-1.5 font-semibold" style={{ fontSize: 11.5, color: discrepancy.some((d) => d.nivel_alerta === "CRITICA") ? "var(--color-red-deep)" : "var(--color-orange)" }}>
            <AlertTriangle size={14} /> Sin confirmación del ERP
          </p>
          {discrepancy.map((d) => (
            <p key={d.proveedor_id} className="text-stone" style={{ fontSize: 10.5 }}>
              {humanizeProviderName(d.proveedor_nombre)}: {d.pendientes_confirmacion} de {d.num_facturas} facturas sin confirmar, {d.dias_desde_pago} días desde el pago.
            </p>
          ))}
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="px-3.5 py-2.5" style={{ background: "var(--color-parchment)" }}>
          <p className="text-ink" style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Detalle del lote</p>
        </div>
        {esMultiproveedor ? (
          <div className="flex flex-col">
            {breakdown.map((b) => {
              const isCollapsed = collapsed.has(b.proveedor_id);
              const providerItems = items.filter((it) => it.proveedor_id === b.proveedor_id);
              return (
                <div key={b.proveedor_id} className="border-b border-line last:border-0">
                  <div
                    className="flex cursor-pointer items-center gap-2 px-3.5 py-2.5"
                    style={{ background: "var(--color-cream-soft)" }}
                    onClick={() => toggleCollapsed(b.proveedor_id)}
                  >
                    {isCollapsed ? <ChevronRight size={13} className="text-stone" /> : <ChevronDown size={13} className="text-stone" />}
                    <span className="text-ink" style={{ fontSize: 12, fontWeight: 700 }}>{humanizeProviderName(b.proveedor_nombre)}</span>
                    <span className="text-stone" style={{ fontSize: 10 }}>
                      {b.num_facturas} facturas{b.num_ncs > 0 ? ` + ${b.num_ncs} NCs` : ""} · Neto {formatFull(b.total_neto)} · ****{b.cuenta_destino?.slice(-4) ?? "----"}
                    </span>
                    <span className={b.inscrita_bancolombia ? "text-success" : "text-orange"} style={{ fontSize: 9.5 }}>
                      {b.inscrita_bancolombia ? "✓ inscrita" : "⚠ no inscrita"}
                    </span>
                  </div>
                  {!isCollapsed && <ItemsTable items={providerItems} />}
                </div>
              );
            })}
          </div>
        ) : (
          <ItemsTable items={items} />
        )}
      </Card>

      <Card>
        <p className="text-ink" style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Trazabilidad</p>
        <div className="mt-2 flex flex-col gap-2">
          {auditLog.map((event) => (
            <div key={event.id} className="flex items-center gap-2 border-b border-line pb-1.5 last:border-0" style={{ fontSize: 11 }}>
              <span className="text-ink" style={{ fontWeight: 700 }}>{EVENT_LABELS[event.event] ?? event.event}</span>
              <span className="text-stone">{formatDateEs(event.event_at)}{event.user_nombre ? ` · ${event.user_nombre}` : ""}</span>
            </div>
          ))}
          {auditLog.length === 0 && <p className="text-stone" style={{ fontSize: 11 }}>Sin eventos registrados.</p>}
        </div>
      </Card>

      {canEdit && batch.estado !== "cancelled" && (
        <div className="flex justify-end gap-2">
          {batch.estado === "draft" && (
            <>
              <button type="button" disabled={pending} onClick={handleExport} className="flex items-center gap-1.5 rounded-md bg-red-deep px-4 py-2 text-white disabled:opacity-40" style={{ fontSize: 12, fontWeight: 800 }}>
                <Download size={14} /> {pending ? "Exportando…" : "Exportar PAB Bancolombia"}
              </button>
              <button type="button" onClick={() => setCancelOpen(true)} className="rounded-md border border-line px-3 py-2 text-graphite" style={{ fontSize: 12, fontWeight: 700 }}>
                Cancelar lote
              </button>
            </>
          )}
          {batch.estado === "exported" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={handleMarkPaid}
                className="flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-white disabled:opacity-40"
                style={{ fontSize: 12, fontWeight: 800 }}
              >
                <CheckCircle2 size={14} /> {pending ? "Marcando…" : "Marcar como pagado"}
              </button>
              <button type="button" disabled={pending} onClick={handleExport} className="rounded-md border border-line px-3 py-2 text-graphite disabled:opacity-40" style={{ fontSize: 12, fontWeight: 700 }}>
                {pending ? "Exportando…" : "Re-exportar PAB"}
              </button>
              <button type="button" onClick={() => setCancelOpen(true)} className="flex items-center gap-1.5 rounded-md border border-red px-3 py-2 text-red-deep" style={{ fontSize: 12, fontWeight: 700 }}>
                <XCircle size={14} /> Cancelar lote
              </button>
            </>
          )}
          {batch.estado === "paid" && (
            <button
              type="button"
              onClick={() => window.location.assign(`/lotes/${batch.codigo_lote}/notificar`)}
              className="flex items-center gap-1.5 rounded-md bg-red-deep px-4 py-2 text-white"
              style={{ fontSize: 12, fontWeight: 800 }}
            >
              <Send size={14} /> {esMultiproveedor ? "Notificar pagos a los proveedores" : "Notificar pago al proveedor"}
            </button>
          )}
        </div>
      )}

      {batch.estado === "cancelled" && batch.cancelled_reason && (
        <Card className="border-line bg-parchment">
          <p className="text-graphite" style={{ fontSize: 11.5 }}><strong>Motivo de cancelación:</strong> {batch.cancelled_reason}</p>
        </Card>
      )}

      <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} batchId={batch.id} codigoLote={batch.codigo_lote} />
      <Toast toast={toast} />
    </div>
  );
}
