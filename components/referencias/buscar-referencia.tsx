"use client";

import { useState } from "react";
import { Search, CheckCircle2, AlertTriangle, MessageCircle, Package, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatFull, formatDateEs, humanizeProviderName } from "@/lib/format";
import type { ReferenciaFacturadaRow } from "@/lib/referencia-data";

const CONTACTOS_BODEGA = [
  { nombre: "Bodega / Compras 1", telefono: "573229046806" },
  { nombre: "Bodega / Compras 2", telefono: "573205046277" },
];

function whatsappUrl(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}

function mensajeNoEncontrada(referencia: string): string {
  return `Hola, estoy verificando la referencia ${referencia}. No me aparece facturada en los últimos 8 días, ¿me confirman su estado en inventario?`;
}

function mensajeFacturadaSinIngresar(row: ReferenciaFacturadaRow): string {
  const entrega = row.entrega_direccion ? ` Se despachó a: ${row.entrega_direccion}${row.entrega_nombre ? ` (${row.entrega_nombre})` : ""}.` : "";
  return `Hola, la referencia ${row.referencia} ya está facturada (factura ${row.num_factura}, ${humanizeProviderName(row.proveedor_correo)}) pero no la veo ingresada al inventario.${entrega} ¿Me confirman si ya llegó o cuándo llega?`;
}

type Estado = "idle" | "loading" | "encontrada" | "no-encontrada" | "error";

export function BuscarReferencia() {
  const [referencia, setReferencia] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [resultados, setResultados] = useState<ReferenciaFacturadaRow[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [referenciaConsultada, setReferenciaConsultada] = useState("");

  async function handleBuscar() {
    const ref = referencia.trim();
    if (!ref) return;
    setEstado("loading");
    setReferenciaConsultada(ref);
    try {
      const res = await fetch(`/api/referencias?ref=${encodeURIComponent(ref)}`, { cache: "no-store" });
      const body = (await res.json()) as { rows?: ReferenciaFacturadaRow[]; error?: string };
      if (!res.ok) {
        setErrorMsg(body.error ?? "No se pudo consultar la referencia.");
        setEstado("error");
        return;
      }
      const rows = body.rows ?? [];
      setResultados(rows);
      setEstado(rows.length > 0 ? "encontrada" : "no-encontrada");
    } catch {
      setErrorMsg("No se pudo consultar la referencia.");
      setEstado("error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-ink" style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>
          Consultar referencia facturada
        </p>
        <p className="mt-1 text-stone" style={{ fontSize: 11.5 }}>
          Solo busca en facturas de proveedores estratégicos emitidas en los últimos 8 días. Si la factura tiene más de
          8 días, se asume que la mercancía ya se recibió y no cuenta como "en tránsito".
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            autoFocus
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleBuscar();
            }}
            placeholder="Ej: 5892333"
            className="flex-1 rounded-md border border-line bg-paper px-4 py-3"
            style={{ fontSize: 16, fontWeight: 700 }}
          />
          <button
            type="button"
            onClick={handleBuscar}
            disabled={!referencia.trim() || estado === "loading"}
            className="flex items-center gap-2 rounded-md bg-red-deep px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-40"
            style={{ fontSize: 13, fontWeight: 800 }}
          >
            <Search size={16} /> {estado === "loading" ? "Consultando…" : "Consultar"}
          </button>
        </div>
      </Card>

      {estado === "error" && (
        <Card className="border-red-deep bg-cream">
          <p className="text-red-deep" style={{ fontSize: 12.5, fontWeight: 700 }}>{errorMsg}</p>
        </Card>
      )}

      {estado === "encontrada" && (
        <div className="flex flex-col gap-2.5">
          <p className="flex items-center gap-1.5 text-success" style={{ fontSize: 12.5, fontWeight: 800 }}>
            <CheckCircle2 size={16} /> Referencia {referenciaConsultada} facturada en los últimos 8 días
          </p>
          <p className="text-stone" style={{ fontSize: 11 }}>
            Ya está facturada, pero eso no significa que ya esté ingresada al inventario. Si no la ves físicamente,
            escríbele a bodega/compras desde cada tarjeta para confirmar.
          </p>
          {resultados.map((r, i) => (
            <Card key={`${r.invoice_key}-${i}`} className="border-success-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-ink" style={{ fontSize: 14, fontWeight: 800 }}>{humanizeProviderName(r.proveedor_correo)}</p>
                  <p className="text-stone" style={{ fontSize: 11.5, marginTop: 2 }}>
                    Factura <strong className="text-ink">{r.num_factura}</strong> ·{" "}
                    {r.fecha_emision_correo ? formatDateEs(r.fecha_emision_correo) : "sin fecha"}
                  </p>
                  {r.descripcion && (
                    <p className="mt-1 flex items-center gap-1 text-graphite" style={{ fontSize: 11.5 }}>
                      <Package size={12} /> {r.descripcion}
                    </p>
                  )}
                  {r.entrega_direccion && (
                    <p className="mt-1 flex items-start gap-1 text-graphite" style={{ fontSize: 11.5 }}>
                      <MapPin size={12} className="mt-0.5 shrink-0" />
                      <span>
                        Despachado a{r.entrega_nombre ? ` ${r.entrega_nombre}` : ""}: {r.entrega_direccion}
                      </span>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-ink" style={{ fontSize: 18, fontWeight: 900 }}>
                    {r.cantidad !== null ? r.cantidad : "—"} {r.unidad_medida ?? ""}
                  </p>
                  <p className="text-stone" style={{ fontSize: 10.5 }}>{formatFull(r.valor_linea)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-2.5 sm:flex-row">
                {CONTACTOS_BODEGA.map((c) => (
                  <a
                    key={c.telefono}
                    href={whatsappUrl(c.telefono, mensajeFacturadaSinIngresar(r))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-white transition-opacity hover:opacity-90"
                    style={{ background: "#25D366", fontSize: 11.5, fontWeight: 800 }}
                  >
                    <MessageCircle size={14} /> ¿Por qué no ha llegado? ({c.telefono.slice(2)})
                  </a>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {estado === "no-encontrada" && (
        <div className="flex flex-col gap-3">
          <Card className="border-orange bg-cream-soft">
            <p className="flex items-center gap-1.5 text-orange" style={{ fontSize: 12.5, fontWeight: 800 }}>
              <AlertTriangle size={16} /> Sin facturas recientes para "{referenciaConsultada}"
            </p>
            <p className="mt-1 text-stone" style={{ fontSize: 11.5 }}>
              No aparece facturada por ningún proveedor estratégico en los últimos 8 días. Por el tiempo transcurrido, si
              existió una factura ya debió recibirse e ingresar a inventario — confirma directamente con bodega/compras.
            </p>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            {CONTACTOS_BODEGA.map((c) => (
              <a
                key={c.telefono}
                href={whatsappUrl(c.telefono, mensajeNoEncontrada(referenciaConsultada))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 text-white transition-opacity hover:opacity-90"
                style={{ background: "#25D366", fontSize: 13, fontWeight: 800 }}
              >
                <MessageCircle size={17} /> Escribir a {c.nombre} ({c.telefono.slice(2)})
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
