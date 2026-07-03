"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ReactivateRetentionRuleButton } from "@/components/providers/reactivate-retention-rule-button";
import { formatDateEs } from "@/lib/format";
import type { RetentionRuleFull } from "@/lib/retention-rule-data";

export function RetentionHistoryToggle({ providerId, rules }: { providerId: number; rules: RetentionRuleFull[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 text-stone" style={{ fontSize: 11, fontWeight: 700 }}>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Ver historial de reglas desactivadas ({rules.length})
      </button>

      {open && rules.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded-md border border-line">
          <table className="w-full" style={{ fontSize: 11 }}>
            <thead>
              <tr className="border-b border-line bg-parchment text-stone" style={{ fontSize: 9, textTransform: "uppercase" }}>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-right">Tasa</th>
                <th className="px-3 py-2 text-left">Desactivada el</th>
                <th className="px-3 py-2 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 text-stone">{r.nombre_regla ?? r.tipo_retencion}</td>
                  <td className="num px-3 py-2 text-right text-stone">{(r.tasa * 100).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-stone">{r.valid_to ? formatDateEs(r.valid_to) : "—"}</td>
                  <td className="px-3 py-2">
                    <ReactivateRetentionRuleButton ruleId={r.id} providerId={providerId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
