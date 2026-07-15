import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { LogOut } from "lucide-react";

export default async function SedeLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session || session.error === "RefreshAccessTokenError") {
    redirect("/login");
  }
  if (session.user.role !== "sede") {
    redirect("/");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <header className="flex items-center justify-between border-b border-line bg-paper px-4 py-3">
        <div>
          <span className="text-red" style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 16, letterSpacing: "-0.02em" }}>
            Ferreinox
          </span>
          <p className="text-stone" style={{ fontSize: 10.5 }}>Abonos — Sede {session.user.sede}</p>
        </div>
        <form action={handleSignOut}>
          <button type="submit" className="flex items-center gap-1.5 text-graphite" style={{ fontSize: 11.5, fontWeight: 700 }}>
            <LogOut size={14} /> Salir
          </button>
        </form>
      </header>
      <main className="flex-1 p-3 md:p-6">
        <div className="mx-auto max-w-[720px]">{children}</div>
      </main>
    </div>
  );
}
