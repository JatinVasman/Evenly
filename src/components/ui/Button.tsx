import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

    const variantStyles = {
      primary:
        "bg-[#065F46] hover:bg-[#047857] active:bg-[#064E3B] text-white shadow-sm",
      secondary:
        "bg-emerald-50 hover:bg-emerald-100 text-[#065F46] border border-emerald-200/60",
      outline:
        "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-700",
      danger:
        "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm",
    };

    const sizeStyles = {
      sm: "h-9 px-3.5 text-xs gap-1.5",
      md: "h-11 px-4 text-sm gap-2 min-h-[44px]", // 44px min touch target
      lg: "h-13 px-6 text-base font-semibold gap-2.5 min-h-[48px]",
      icon: "h-10 w-10 min-h-[40px] min-w-[40px] p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {typeof children === "string" ? "Please wait..." : children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
