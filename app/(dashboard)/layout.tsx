import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900">Pagos Proveedores</span>
          <span className="text-sm text-slate-500">
            {session.user.email} · <span className="font-semibold">{session.user.role}</span>
          </span>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
