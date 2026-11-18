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
    surface: "bg-white border border-slate-200/80 shadow-xs",
    flat: "bg-slate-50 border border-slate-200/60",
    elevated: "bg-white border border-slate-100 shadow-md",
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
