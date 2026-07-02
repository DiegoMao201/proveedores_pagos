"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { createProvider } from "@/lib/provider-actions";

const CATEGORIAS = [
  { value: "estrategico", label: "Estratégico" },
  { value: "operativo", label: "Operativo" },
  { value: "locativo", label: "Locativo" },
  { value: "esporadico", label: "Esporádico" },
  { value: "institucional", label: "Institucional" },
];

const FORMAS_PAGO = [
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "pse", label: "PSE" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-stone" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-md border border-line bg-paper px-2.5 py-1.5 text-ink outline-none transition-colors hover:border-stone focus:border-red";

export function NewProviderModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [nif, setNif] = useState("");
  const [categoria, setCategoria] = useState("");
  const [plazoPago, setPlazoPago] = useState("30");
  const [formaPago, setFormaPago] = useState("transferencia");
  const [emailPago, setEmailPago] = useState("");
  const [telefono, setTelefono] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");

  function reset() {
    setStep(1);
    setNombre("");
    setNif("");
    setCategoria("");
    setPlazoPago("30");
    setFormaPago("transferencia");
    setEmailPago("");
    setTelefono("");
    setContactoNombre("");
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        const { id } = await createProvider({
          nombre,
          nif: nif || null,
          categoria_proveedor: categoria || null,
          plazo_pago_dias: plazoPago ? Number(plazoPago) : null,
          forma_pago: formaPago || null,
          email_pago: emailPago || null,
          telefono: telefono || null,
          contacto_pagos: contactoNombre || null,
        });
        showToast({ kind: "success", message: "Proveedor creado correctamente." });
        setOpen(false);
        reset();
        router.push(`/proveedores/${id}`);
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo crear el proveedor." });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-red-deep px-4 py-2 text-white transition-colors hover:opacity-90"
        style={{ fontSize: 12, fontWeight: 800 }}
      >
        <Plus size={14} />
        Nuevo proveedor
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={`Nuevo proveedor — paso ${step} de 3`}
      >
        <div className="flex flex-col gap-3">
          {step === 1 && (
            <>
              <Field label="Nombre">
                <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Razón social" />
              </Field>
              <Field label="NIT">
                <input className={inputClass} value={nif} onChange={(e) => setNif(e.target.value)} placeholder="900123456" />
              </Field>
              <Field label="Categoría">
                <select className={inputClass} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plazo de pago (días)">
                  <input
                    type="number"
                    className={inputClass}
                    value={plazoPago}
                    onChange={(e) => setPlazoPago(e.target.value)}
                  />
                </Field>
                <Field label="Forma de pago">
                  <select className={inputClass} value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                    {FORMAS_PAGO.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Email de pago">
                <input
                  type="email"
                  className={inputClass}
                  value={emailPago}
                  onChange={(e) => setEmailPago(e.target.value)}
                  placeholder="pagos@proveedor.com"
                />
              </Field>
              <Field label="Teléfono">
                <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </Field>
              <Field label="Contacto">
                <input className={inputClass} value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} />
              </Field>
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-2 rounded-md border border-line bg-parchment p-3" style={{ fontSize: 11 }}>
              <p className="text-graphite" style={{ fontWeight: 700 }}>
                Resumen
              </p>
              <p>
                <strong>{nombre || "—"}</strong> · NIT {nif || "—"}
              </p>
              <p className="text-stone">
                {CATEGORIAS.find((c) => c.value === categoria)?.label ?? "Sin categoría"} · {plazoPago || "—"} días ·{" "}
                {FORMAS_PAGO.find((f) => f.value === formaPago)?.label}
              </p>
              <p className="text-stone">{emailPago || "sin email de pago"}</p>
              <p className="text-stone">
                La cuenta bancaria se puede agregar después desde el perfil del proveedor, en la pestaña &quot;Cuentas bancarias&quot;.
              </p>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-graphite"
                style={{ fontSize: 11, fontWeight: 700 }}
              >
                <ChevronLeft size={13} /> Atrás
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button
                type="button"
                disabled={step === 1 && !nombre.trim()}
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1 rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
                style={{ fontSize: 11, fontWeight: 800 }}
              >
                Siguiente <ChevronRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={handleSubmit}
                className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
                style={{ fontSize: 11, fontWeight: 800 }}
              >
                {pending ? "Creando…" : "Crear proveedor"}
              </button>
            )}
          </div>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
