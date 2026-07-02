"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionTab {
  key: string;
  label: string;
  content: ReactNode;
}

export function SectionTabs({ tabs, defaultTab }: { tabs: SectionTab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 font-semibold transition-colors",
              active === tab.key ? "border-red text-red-deep" : "border-transparent text-stone hover:text-graphite"
            )}
            style={{ fontSize: 11.5 }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab?.content}
    </div>
  );
}
