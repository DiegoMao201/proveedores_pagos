import type { ReactNode } from "react";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session || session.error === "RefreshAccessTokenError") {
    redirect("/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const userInitial = (session.user.name || session.user.email).trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-screen flex-col">
      <div className="hidden md:block">
        <Topbar email={session.user.email} name={session.user.name} role={session.user.role} onSignOut={handleSignOut} />
      </div>
      <MobileHeader userInitial={userInitial} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="mx-auto max-w-[1440px] p-3 md:p-4">{children}</div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
