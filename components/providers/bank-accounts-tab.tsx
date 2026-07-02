"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Toast, useToast } from "@/components/ui/toast";
import { AddBankAccountModal } from "@/components/providers/add-bank-account-modal";
import { deactivateBankAccount, setBankAccountPrincipal } from "@/lib/provider-actions";
import type { BankAccountRow, BankCatalogRow } from "@/lib/bank-account-data";

function bankName(catalog: BankCatalogRow[], codigo: number): string {
  return catalog.find((b) => b.codigo === codigo)?.nombre ?? `Código ${codigo}`;
}

export function BankAccountsTab({
  providerId,
  accounts,
  bankCatalog,
  nitDefault,
  nombreDefault,
  canEdit,
}: {
  providerId: number;
  accounts: BankAccountRow[];
  bankCatalog: BankCatalogRow[];
  nitDefault: string | null;
  nombreDefault: string;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, showToast } = useToast();

  function handlePrincipal(id: number) {
    startTransition(async () => {
      try {
        await setBankAccountPrincipal(id, providerId);
        showToast({ kind: "success", message: "Cuenta marcada como principal." });
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo actualizar." });
      }
    });
  }

  function handleDeactivate(id: number) {
    startTransition(async () => {
      try {
        await deactivateBankAccount(id, providerId);
        showToast({ kind: "success", message: "Cuenta desactivada." });
        router.refresh();
      } catch (e) {
        showToast({ kind: "error", message: e instanceof Error ? e.message : "No se pudo desactivar." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-ink" style={{ fontWeight: 800, fontSize: 12 }}>
          Cuentas bancarias
        </h2>
        {canEdit && (
          <AddBankAccountModal providerId={providerId} nitDefault={nitDefault} nombreDefault={nombreDefault} bankCatalog={bankCatalog} />
        )}
      </div>

      {accounts.length === 0 ? (
        <Card>
          <p className="text-stone" style={{ fontSize: 11 }}>
            Este proveedor todavía no tiene cuentas bancarias registradas.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {accounts.map((acc) => (
            <Card key={acc.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-ink" style={{ fontWeight: 700, fontSize: 12 }}>
                    {bankName(bankCatalog, acc.codigo_banco)}
                  </p>
                  {acc.es_principal && (
                    <span className="inline-flex items-center rounded-full bg-cream-soft px-2 py-0.5 font-extrabold text-red-deep" style={{ fontSize: 9 }}>
                      PRINCIPAL
                    </span>
                  )}
                  {acc.inscrita_bancolombia ? (
                    <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 font-bold text-success" style={{ fontSize: 9 }}>
                      ✓ Inscrita en Bancolombia
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-cream px-2 py-0.5 font-bold text-graphite" style={{ fontSize: 9 }}>
                      ⚠ No inscrita
                    </span>
                  )}
                </div>
                <p className="num text-stone" style={{ fontSize: 11, marginTop: 2 }}>
                  {acc.numero_cuenta} · {acc.tipo_cuenta === "S" ? "Ahorros" : "Corriente"}
                  {acc.email_pago ? ` · ${acc.email_pago}` : ""}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  {!acc.es_principal && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handlePrincipal(acc.id)}
                      className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-graphite"
                      style={{ fontSize: 10, fontWeight: 700 }}
                    >
                      <Star size={11} /> Marcar principal
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleDeactivate(acc.id)}
                    className="flex items-center gap-1 rounded-md border border-red px-2.5 py-1 text-red-deep"
                    style={{ fontSize: 10, fontWeight: 700 }}
                  >
                    <Ban size={11} /> Desactivar
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <Toast toast={toast} />
    </div>
  );
}
