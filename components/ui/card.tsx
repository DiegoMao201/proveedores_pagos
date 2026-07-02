import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-paper p-6 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
}
