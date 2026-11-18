"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FolderKanban, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  // If on new expense, detail editing, or auth screens, hide bottom nav to maximize focus
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname.startsWith("/invite/");

  if (
    isAuthPage ||
    pathname === "/expenses/new" ||
    (pathname.startsWith("/expenses/") && pathname.endsWith("/edit"))
  ) {
    return null;
  }

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Friends", href: "/friends", icon: Users },
    { label: "Groups", href: "/groups", icon: FolderKanban },
    { label: "Activity", href: "/activity", icon: Clock },
  ];

  // Hide floating Add Expense on profile and activity screens per request
  const hideFloatingAdd =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/expenses");

  return (
    <div className="relative shrink-0 w-full z-30">
      {/* Floating Add Expense Action Button - anchored directly above bottom nav inside mobile frame */}
      {!hideFloatingAdd && (
        <div className="absolute -top-16 right-4 z-40">
          <Link
            href="/expenses/new"
            className="flex items-center gap-2 px-4 py-3 bg-[#065F46] hover:bg-[#047857] active:bg-[#064E3B] text-white rounded-full shadow-lg shadow-emerald-950/25 font-semibold text-sm transition-transform active:scale-95 border border-emerald-500/30"
            aria-label="Add new expense"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Add Expense</span>
          </Link>
        </div>
      )}

      {/* Persistent Bottom Navigation Bar pinned cleanly to bottom */}
      <nav className="w-full bg-white/95 dark:bg-[#141B18]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-[#22302A] px-2 pt-2 pb-safe flex items-center justify-around shadow-lg select-none">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition select-none active:scale-95 min-h-[44px]",
                isActive
                  ? "text-[#065F46] dark:text-emerald-400 font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-full transition-colors",
                  isActive ? "bg-emerald-50 dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-400" : ""
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.4]" : "stroke-[1.8]")} />
              </div>
              <span className="text-[11px] font-medium tracking-tight mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
