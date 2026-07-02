"use client";

import { Menu, Bell } from "lucide-react";

export function MobileHeader({ userInitial }: { userInitial: string }) {
  return (
    <header
      className="flex items-center justify-between border-b border-line bg-paper md:hidden"
      style={{ padding: "10px 14px", height: 44 }}
    >
      <div className="flex items-center gap-2">
        <Menu size={20} className="text-graphite" />
        <span style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 14 }} className="text-red">
          Ferreinox
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Bell size={18} className="text-graphite" />
        <span
          className="flex items-center justify-center text-red-deep"
          style={{ width: 26, height: 26, borderRadius: 999, background: "var(--color-cream)", fontWeight: 800, fontSize: 11 }}
        >
          {userInitial}
        </span>
      </div>
    </header>
  );
}
