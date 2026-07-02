"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastKind = "success" | "warning" | "error";

export interface ToastState {
  kind: ToastKind;
  message: string;
}

const CONFIG: Record<ToastKind, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "bg-success text-white" },
  warning: { icon: AlertTriangle, className: "bg-yellow text-graphite" },
  error: { icon: XCircle, className: "bg-red-deep text-white" },
};

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, showToast: setToast };
}

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  const config = CONFIG[toast.kind];
  const Icon = config.icon;
  return (
    <div
      className={cn("fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg", config.className)}
      style={{ fontSize: 12, fontWeight: 600, maxWidth: 360 }}
    >
      <Icon size={16} className="shrink-0" />
      {toast.message}
    </div>
  );
}
