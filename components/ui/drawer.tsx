"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onCloseHref: string;
  title: string;
  children: ReactNode;
}

// Controlado por query param (ver paginas que lo usan): el detalle abierto vive en
// la URL para que Diego pueda compartir el link exacto de una factura (regla E.4).
export function Drawer({ open, onCloseHref, title, children }: DrawerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") router.push(onCloseHref);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCloseHref, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-[rgba(26,22,20,0.4)] transition-opacity duration-200"
        onClick={() => router.push(onCloseHref)}
      />
      <div className="relative flex h-full w-full max-w-[480px] translate-x-0 flex-col bg-paper shadow-lg transition-transform duration-200 ease-out">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            aria-label="Cerrar"
            onClick={() => router.push(onCloseHref)}
            className="rounded-md p-1 text-stone hover:bg-parchment focus-visible:outline-none focus-visible:shadow-glow-red"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
