"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}

function buildHref(basePath: string, searchParams: Record<string, string | undefined>, overrides: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    params.set(key, value);
  }
  return `${basePath}?${params.toString()}`;
}

export function TablePagination({ page, pageSize, total, basePath, searchParams }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-4">
      <p className="text-sm text-stone">
        Mostrando <span className="num font-semibold text-ink">{from}-{to}</span> de{" "}
        <span className="num font-semibold text-ink">{total.toLocaleString("es-CO")}</span>
      </p>

      <div className="flex items-center gap-3">
        <label className="text-sm text-stone">Por página</label>
        <select
          defaultValue={String(pageSize)}
          onChange={(e) => {
            window.location.href = buildHref(basePath, searchParams, { pageSize: e.target.value, page: "1" });
          }}
          className="rounded-md border border-line bg-paper px-2 py-1 text-sm"
        >
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>

        <Link
          href={buildHref(basePath, searchParams, { page: String(Math.max(1, page - 1)) })}
          aria-disabled={page <= 1}
          className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-parchment aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Anterior
        </Link>
        <span className="num text-sm text-stone">
          {page} / {totalPages}
        </span>
        <Link
          href={buildHref(basePath, searchParams, { page: String(Math.min(totalPages, page + 1)) })}
          aria-disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-parchment aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          Siguiente
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
