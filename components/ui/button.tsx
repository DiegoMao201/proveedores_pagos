import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-red text-white hover:bg-red-deep",
  secondary: "bg-paper border border-line text-ink hover:bg-parchment",
  tertiary: "bg-transparent text-red hover:underline",
  destructive: "bg-red-deep text-white hover:opacity-90",
  success: "bg-success text-white hover:opacity-90",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "rounded-md px-6 py-3 text-sm font-semibold transition-colors duration-150",
          "focus-visible:outline-none focus-visible:shadow-glow-red",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
