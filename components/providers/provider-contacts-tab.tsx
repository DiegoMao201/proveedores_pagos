"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Ban, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClassName } from "@/components/ui/form-field";
import { Toast, useToast } from "@/components/ui/toast";
import { addProviderContact, deactivateProviderContact } from "@/lib/provider-actions";
import type { ProviderContactRow } from "@/lib/provider-contact-data";

function AddContactModal({ providerId }: { providerId: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");

  function save() {
    startTransition(async () => {
      try {
        await addProviderContact(providerId, { nombre: nombre || null, email, notas: notas || null });
        showToast({ kind: "success", message: "Contacto agregado." });
        setOpen(false);
        setNombre("");
        setEmail("");
        setNotas("");
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo agregar el contacto." });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-graphite transition-colors hover:border-red"
        style={{ fontSize: 11, fontWeight: 700 }}
      >
        <Plus size={13} /> Agregar contacto
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo contacto de correo" width={420}>
        <div className="flex flex-col gap-3">
          <FormField label="Correo">
            <input
              type="email"
              className={inputClassName(false)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@empresa.com"
            />
          </FormField>
          <FormField label="Nombre (opcional)">
            <input className={inputClassName(false)} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Quién es esta persona" />
          </FormField>
          <FormField label="Notas (opcional)">
            <input className={inputClassName(false)} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: contadora, solo copia..." />
          </FormField>
          <button
            type="button"
            disabled={pending || !email}
            onClick={save}
            className="self-end rounded-md bg-red-deep px-4 py-1.5 text-white disabled:opacity-40"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {pending ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}

export function ProviderContactsTab({
  providerId,
  contacts,
  canEdit,
}: {
  providerId: number;
  contacts: ProviderContactRow[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  function handleDeactivate(id: number) {
    startTransition(async () => {
      try {
        await deactivateProviderContact(id, providerId);
        showToast({ kind: "success", message: "Contacto eliminado." });
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo eliminar." });
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12 }}>
            Correos para soporte de pagos
          </h2>
          <p className="text-stone" style={{ fontSize: 10.5 }}>
            Todos estos correos reciben el soporte cuando se notifica un pago a este proveedor.
          </p>
        </div>
        {canEdit && <AddContactModal providerId={providerId} />}
      </div>

      {contacts.length === 0 ? (
        <p className="text-stone" style={{ fontSize: 11 }}>
          Todavía no hay contactos adicionales — solo se usará el email de pago de la cuenta bancaria.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-stone" />
                <div>
                  <p className="text-ink" style={{ fontSize: 11.5, fontWeight: 700 }}>
                    {c.email}
                  </p>
                  {(c.nombre || c.notas) && (
                    <p className="text-stone" style={{ fontSize: 10 }}>
                      {[c.nombre, c.notas].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleDeactivate(c.id)}
                  className="flex items-center gap-1 rounded-md border border-red px-2.5 py-1 text-red-deep"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  <Ban size={11} /> Quitar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <Toast toast={toast} />
    </Card>
  );
}
