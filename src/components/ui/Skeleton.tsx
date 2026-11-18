import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200/70", className)}
      {...props}
    />
  );
}

export function ExpenseSkeleton() {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-4 rounded-md" />
          <Skeleton className="w-20 h-3 rounded-md" />
        </div>
      </div>
      <div className="space-y-1.5 text-right">
        <Skeleton className="w-16 h-4 rounded-md ml-auto" />
        <Skeleton className="w-24 h-3 rounded-md ml-auto" />
      </div>
    </div>
  );
}
