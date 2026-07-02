import { Card } from "@/components/ui/card";
import { formatDateRelative } from "@/lib/format";
import type { ProviderHistoryRow } from "@/lib/provider-detail-data";

const OPERATION_LABEL: Record<string, string> = {
  INSERT: "Creación",
  UPDATE: "Modificación",
  DELETE: "Eliminación",
};

const TABLE_LABEL: Record<string, string> = {
  provider: "Datos del proveedor",
  bank_account: "Cuenta bancaria",
};

function fieldValue(row: Record<string, unknown> | null, field: string): string {
  if (!row) return "—";
  const v = row[field];
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}

export function ProviderHistoryTab({ history }: { history: ProviderHistoryRow[] }) {
  if (history.length === 0) {
    return (
      <Card>
        <p className="text-stone" style={{ fontSize: 11 }}>
          Todavía no hay cambios registrados para este proveedor.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {history.map((h) => (
        <Card key={h.history_id} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-ink" style={{ fontWeight: 700, fontSize: 12 }}>
              {OPERATION_LABEL[h.operation] ?? h.operation} · {TABLE_LABEL[h.table_name] ?? h.table_name}
            </span>
            <span className="text-stone" style={{ fontSize: 10 }}>
              {formatDateRelative(h.changed_at)}
            </span>
          </div>
          {h.changed_fields && h.changed_fields.length > 0 && (
            <div className="flex flex-col gap-1">
              {h.changed_fields
                .filter((f) => f !== "id")
                .map((field) => (
                  <p key={field} className="text-stone" style={{ fontSize: 10.5 }}>
                    <span className="font-semibold text-graphite">{field}</span>: {fieldValue(h.old_row, field)} →{" "}
                    <span className="font-semibold text-ink">{fieldValue(h.new_row, field)}</span>
                  </p>
                ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
