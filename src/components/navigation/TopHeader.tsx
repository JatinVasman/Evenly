"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useCurrentUser } from "@/context/UserContext";
import { APP_CONFIG } from "@/config/app";

export interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
  isRevalidating?: boolean;
}

export function TopHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  rightAction,
  isRevalidating = false,
}: TopHeaderProps) {
  const router = useRouter();
  const { user } = useCurrentUser();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-30 shrink-0 bg-[#F8FAF8]/95 backdrop-blur-md px-4 pt-safe pb-3 border-slate-200/60 flex items-center justify-between min-h-[58px]">
      {/* Left Slot: Fixed width matching right slot for exact mathematical centering */}
      <div className="flex items-center justify-start w-20 shrink-0">
        {showBack && (
          <button
            onClick={handleBack}
            className="w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 transition active:scale-95"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Center Slot: Centered Heading */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-1 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <h1
            className={`font-serif font-bold text-slate-900 tracking-tight truncate max-w-full ${
              !showBack && !title ? "text-2xl" : "text-base sm:text-lg"
            }`}
          >
            {title || APP_CONFIG.name}
          </h1>
          {isRevalidating && (
            <span
              className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"
              title="Updating..."
            />
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-500 font-medium truncate max-w-full -mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Slot: Fixed width matching left slot */}
      <div className="flex items-center justify-end w-20 shrink-0 gap-2">
        {rightAction ? (
          rightAction
        ) : (
          <div className="flex items-center gap-2">
          
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full border border-emerald-600/30 overflow-hidden shrink-0 hover:ring-2 hover:ring-emerald-500 transition active:scale-95 block shadow-xs"
              aria-label="Open profile and account"
              title="Open profile"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.image || `https://avatar.vercel.sh/${user.username}.svg`}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
