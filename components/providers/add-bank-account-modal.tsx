"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { createBankAccount, type MedioPago } from "@/lib/provider-actions";
import type { BankCatalogRow } from "@/lib/bank-account-data";

const TIPO_DOCUMENTO = [
  { value: 1, label: "Cédula de ciudadanía" },
  { value: 2, label: "Tarjeta de identidad" },
  { value: 3, label: "NIT" },
  { value: 4, label: "Cédula de extranjería" },
  { value: 5, label: "Pasaporte" },
];

const TIPO_TRANSACCION = [
  { value: 27, label: "27 — mismo banco Bancolombia" },
  { value: 37, label: "37 — otros bancos" },
  { value: 23, label: "23" },
  { value: 25, label: "25" },
  { value: 33, label: "33" },
  { value: 36, label: "36" },
  { value: 40, label: "40" },
  { value: 52, label: "52" },
  { value: 53, label: "53" },
];

export function AddBankAccountModal({
  providerId,
  nitDefault,
  nombreDefault,
  bankCatalog,
}: {
  providerId: number;
  nitDefault: string | null;
  nombreDefault: string;
  bankCatalog: BankCatalogRow[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [medioPago, setMedioPago] = useState<MedioPago>("transferencia");
  const [tipoDoc, setTipoDoc] = useState(3);
  const [nit, setNit] = useState(nitDefault ?? "");
  const [nombre, setNombre] = useState(nombreDefault);
  const [tipoTrans, setTipoTrans] = useState(27);
  const [banco, setBanco] = useState(bankCatalog[0]?.codigo ?? 1007);
  const [cuenta, setCuenta] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState<"S" | "D">("D");
  const [email, setEmail] = useState("");
  const [referencia, setReferencia] = useState("");
  const [celular, setCelular] = useState("");

  const esPortal = medioPago === "portal_proveedor";

  function handleSubmit() {
    startTransition(async () => {
      try {
        const { inscrita } = await createBankAccount(providerId, {
          medio_pago: medioPago,
          tipo_documento_beneficiario: tipoDoc,
          nit_beneficiario: nit,
          nombre_beneficiario: nombre,
          tipo_transaccion: esPortal ? null : tipoTrans,
          codigo_banco: esPortal ? null : banco,
          numero_cuenta: esPortal ? null : cuenta,
          tipo_cuenta: esPortal ? null : tipoCuenta,
          email_pago: email || null,
          referencia: referencia || null,
          celular_beneficiario: celular || null,
        });
        showToast({
          kind: esPortal ? "success" : inscrita ? "success" : "warning",
          message: esPortal
            ? "✓ Portal proveedor guardado — este proveedor ya se puede pagar y marcar como pagado sin archivo PAB."
            : inscrita
            ? "✓ Cuenta encontrada en catálogo Bancolombia — marcada como inscrita."
            : "Cuenta guardada pero no inscrita — no podrás pagarla vía PAB hasta inscribirla.",
        });
        setOpen(false);
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo guardar la cuenta." });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-red-deep px-3 py-1.5 text-white"
        style={{ fontSize: 11, fontWeight: 800 }}
      >
        <Plus size={13} />
        Agregar cuenta / medio de pago
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva cuenta / medio de pago" width={520}>
        <div className="flex flex-col gap-3">
          <FormField label="Medio de pago">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMedioPago("transferencia")}
                className="flex-1 rounded-md border px-3 py-2 text-left"
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  borderColor: !esPortal ? "var(--color-red)" : "var(--color-line)",
                  background: !esPortal ? "var(--color-cream-soft)" : "transparent",
                  color: !esPortal ? "var(--color-red-deep)" : "var(--color-graphite)",
                }}
              >
                Transferencia bancaria
              </button>
              <button
                type="button"
                onClick={() => setMedioPago("portal_proveedor")}
                className="flex-1 rounded-md border px-3 py-2 text-left"
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  borderColor: esPortal ? "var(--color-red)" : "var(--color-line)",
                  background: esPortal ? "var(--color-cream-soft)" : "transparent",
                  color: esPortal ? "var(--color-red-deep)" : "var(--color-graphite)",
                }}
              >
                Portal del proveedor
              </button>
            </div>
            {esPortal && (
              <p className="text-stone" style={{ fontSize: 10, marginTop: 4 }}>
                Este proveedor se paga directamente en su propio portal web, no por transferencia. El lote no
                generará archivo PAB para él y podrás marcarlo como pagado sin exportar banco.
              </p>
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo documento beneficiario">
              <select className={inputClassName(false)} value={tipoDoc} onChange={(e) => setTipoDoc(Number(e.target.value))}>
                {TIPO_DOCUMENTO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="NIT beneficiario">
              <input className={inputClassName(false)} value={nit} onChange={(e) => setNit(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Nombre beneficiario">
            <input className={inputClassName(false)} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </FormField>

          {!esPortal && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Tipo transacción">
                  <select className={inputClassName(false)} value={tipoTrans} onChange={(e) => setTipoTrans(Number(e.target.value))}>
                    {TIPO_TRANSACCION.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Banco">
                  <select className={inputClassName(false)} value={banco} onChange={(e) => setBanco(Number(e.target.value))}>
                    {bankCatalog.map((b) => (
                      <option key={b.codigo} value={b.codigo}>
                        {b.nombre}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Número de cuenta">
                  <input className={inputClassName(false)} value={cuenta} onChange={(e) => setCuenta(e.target.value)} />
                </FormField>
                <FormField label="Tipo de cuenta">
                  <select className={inputClassName(false)} value={tipoCuenta} onChange={(e) => setTipoCuenta(e.target.value as "S" | "D")}>
                    <option value="D">Corriente</option>
                    <option value="S">Ahorros</option>
                  </select>
                </FormField>
              </div>
            </>
          )}

          <FormField label="Email de pago">
            <input type="email" className={inputClassName(false)} value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={esPortal ? "URL o instrucciones del portal" : "Referencia (opcional)"}>
              <input className={inputClassName(false)} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
            </FormField>
            <FormField label="Celular (opcional)">
              <input className={inputClassName(false)} value={celular} onChange={(e) => setCelular(e.target.value)} />
            </FormField>
          </div>

          <button
            type="button"
            disabled={pending || !nombre || (!esPortal && !cuenta)}
            onClick={handleSubmit}
            className="mt-2 self-end rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
