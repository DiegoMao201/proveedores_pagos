"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

interface FilterField {
  name: string;
  label: string;
  type: "text" | "date" | "number" | "select";
  options?: { value: string; label: string }[];
}

interface TableToolbarProps {
  searchPlaceholder: string;
  filterFields?: FilterField[];
}

// Client component minimo: solo actualiza la URL (regla E.4). La tabla en si es
// un Server Component que lee searchParams y hace fetch server-side.
export function TableToolbar({ searchPlaceholder, filterFields = [] }: TableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    updateParam("q", q);
  }

  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-line bg-parchment px-6 py-4">
      <form onSubmit={handleSearchSubmit} className="min-w-[240px] flex-1">
        <label className="mb-1 block text-sm font-semibold text-graphite">Buscar</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-line bg-paper py-2 pl-9 pr-3 text-sm outline-none transition-colors hover:border-stone focus:border-red focus:shadow-glow-red"
          />
        </div>
      </form>

      {filterFields.map((field) => (
        <div key={field.name} className="min-w-[160px]">
          <label className="mb-1 block text-sm font-semibold text-graphite">{field.label}</label>
          {field.type === "select" ? (
            <select
              defaultValue={searchParams.get(field.name) ?? ""}
              onChange={(e) => updateParam(field.name, e.target.value)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors hover:border-stone focus:border-red focus:shadow-glow-red"
            >
              <option value="">Todos</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              defaultValue={searchParams.get(field.name) ?? ""}
              onBlur={(e) => updateParam(field.name, e.target.value)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors hover:border-stone focus:border-red focus:shadow-glow-red"
            />
          )}
        </div>
      ))}
    </div>
  );
}
