import { cn } from "@/lib/cn";

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-stone" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "rounded-md border border-line bg-paper px-2.5 py-1.5 text-ink outline-none transition-colors hover:border-stone focus:border-red disabled:bg-parchment disabled:text-stone";

export function inputClassName(disabled: boolean) {
  return cn(inputClass, disabled && "cursor-not-allowed");
}
