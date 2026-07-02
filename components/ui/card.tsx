import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-paper p-3.5 shadow-sm transition-shadow duration-200",
        "hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}
