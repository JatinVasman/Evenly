import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "positive" | "negative" | "emerald" | "amber";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    positive: "bg-emerald-50 text-emerald-800 border-emerald-200/80 font-semibold",
    negative: "bg-red-50 text-red-800 border-red-200/80 font-semibold",
    emerald: "bg-[#065F46] text-white border-transparent",
    amber: "bg-amber-50 text-amber-800 border-amber-200/80 font-medium",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full border transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
