import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "surface" | "flat" | "elevated" | "accent";
}

export function Card({
  className,
  variant = "surface",
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    surface: "bg-white dark:bg-[#141B18] border border-slate-200/80 dark:border-[#22302A] shadow-xs text-slate-900 dark:text-white",
    flat: "bg-slate-50 dark:bg-[#1A2420] border border-slate-200/60 dark:border-[#22302A] text-slate-900 dark:text-white",
    elevated: "bg-white dark:bg-[#141B18] border border-slate-100 dark:border-[#22302A] shadow-md text-slate-900 dark:text-white",
    accent: "bg-[#064E3B] text-white border border-emerald-700/60 shadow-lg",
  };

  return (
    <div
      className={cn("rounded-2xl p-4 transition-all", variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
