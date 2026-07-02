"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { Toast, useToast } from "@/components/ui/toast";
import { updateProviderContacts } from "@/lib/provider-actions";
import type { ProviderFull } from "@/lib/provider-detail-data";

export function EditableContactsForm({ provider, canEdit }: { provider: ProviderFull; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [emailPago, setEmailPago] = useState(provider.email_pago ?? "");
  const [contactoNombre, setContactoNombre] = useState(provider.contacto_pagos ?? "");
  const [contactoCargo, setContactoCargo] = useState(provider.contacto_cargo ?? "");
  const [telefono, setTelefono] = useState(provider.telefono ?? "");

  function reset() {
    setEmailPago(provider.email_pago ?? "");
    setContactoNombre(provider.contacto_pagos ?? "");
    setContactoCargo(provider.contacto_cargo ?? "");
    setTelefono(provider.telefono ?? "");
    setEditing(false);
  }

  function save() {
    startTransition(async () => {
      try {
        await updateProviderContacts(provider.id, {
          email_pago: emailPago || null,
          contacto_pagos: contactoNombre || null,
          contacto_cargo: contactoCargo || null,
          telefono: telefono || null,
        });
        showToast({ kind: "success", message: "Contactos actualizados." });
        setEditing(false);
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo guardar." });
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12 }}>
          Contactos y correos
        </h2>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 text-red-deep" style={{ fontSize: 11, fontWeight: 700 }}>
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Email de pago">
          <input type="email" disabled={!editing} className={inputClassName(!editing)} value={emailPago} onChange={(e) => setEmailPago(e.target.value)} />
        </FormField>
        <FormField label="Teléfono">
          <input disabled={!editing} className={inputClassName(!editing)} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </FormField>
        <FormField label="Contacto nombre">
          <input disabled={!editing} className={inputClassName(!editing)} value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} />
        </FormField>
        <FormField label="Contacto cargo">
          <input disabled={!editing} className={inputClassName(!editing)} value={contactoCargo} onChange={(e) => setContactoCargo(e.target.value)} />
        </FormField>
      </div>

      {editing && (
        <div className="flex items-center gap-2">
          <button type="button" disabled={pending} onClick={save} className="rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40" style={{ fontSize: 11, fontWeight: 800 }}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="button" onClick={reset} className="rounded-md border border-line px-3 py-1.5 text-graphite" style={{ fontSize: 11, fontWeight: 700 }}>
            Deshacer
          </button>
        </div>
      )}
      <Toast toast={toast} />
    </Card>
  );
}
