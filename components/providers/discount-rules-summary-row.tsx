"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { DiscountScaleVisual } from "@/components/providers/discount-scale-visual";
import { formatCompact, formatDateRelative, humanizeProviderName } from "@/lib/format";
import type { DiscountRulesSummaryRow } from "@/lib/discount-rules-summary-data";
import type { DiscountRuleFull } from "@/lib/discount-rule-data";

export function DiscountRulesSummaryRowItem({ row, rules }: { row: DiscountRulesSummaryRow; rules: DiscountRuleFull[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="border-b border-line last:border-0 hover:bg-cream/30">
        <td className="px-4 py-2.5">
          <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 font-semibold text-ink">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {humanizeProviderName(row.nombre)}
          </button>
        </td>
        <td className="px-4 py-2.5">
          <div className="flex flex-wrap gap-1">
            {rules.map((r) => (
              <span key={r.id} className="inline-flex items-center rounded-full bg-cream-soft px-2 py-0.5 font-semibold text-red-deep" style={{ fontSize: 10 }}>
                {(r.tasa_descuento * 100).toFixed(0)}%·{r.dias_max}d
              </span>
            ))}
          </div>
        </td>
        <td className="num px-4 py-2.5 text-right text-success">{formatCompact(row.ahorro_capturable_actual)}</td>
        <td className="num px-4 py-2.5 text-right text-orange">{formatCompact(row.ahorro_perdido_hoy)}</td>
        <td className="px-4 py-2.5 text-stone" style={{ fontSize: 11 }}>
          {row.ultima_modificacion ? formatDateRelative(row.ultima_modificacion) : "—"}
        </td>
        <td className="px-4 py-2.5">
          <Link href={`/proveedores/${row.provider_id}`} className="flex items-center gap-1 text-red-deep" style={{ fontSize: 11, fontWeight: 700 }}>
            Ver perfil <ExternalLink size={11} />
          </Link>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-line last:border-0 bg-parchment">
          <td colSpan={6} className="px-4 py-3">
            <DiscountScaleVisual rules={rules} />
          </td>
        </tr>
      )}
    </>
  );
}
