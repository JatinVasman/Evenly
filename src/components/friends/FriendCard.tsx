import React from "react";
import Link from "next/link";
import { User } from "@/types";
import { formatPaise } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export interface FriendCardProps {
  user: User;
  netPaise: number; // positive = they owe you; negative = you owe them; 0 = settled
  onSettle?: (e: React.MouseEvent) => void;
}

export function FriendCard({ user, netPaise, onSettle }: FriendCardProps) {
  const owesYou = netPaise > 0;
  const youOwe = netPaise < 0;
  const isSettled = netPaise === 0;

  return (
    <Link
      href={`/friends/${user.id}`}
      className="flex items-center justify-between p-3.5 bg-white dark:bg-[#141B18] rounded-2xl border border-slate-200/70 dark:border-[#22302A] shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm active:scale-[0.99] transition"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-11 h-11 rounded-full overflow-hidden border border-slate-200 dark:border-[#22302A] shrink-0 bg-slate-100 dark:bg-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.image || `https://avatar.vercel.sh/${user.username}.svg`}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {user.name}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">@{user.username}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-right">
          {owesYou && (
            <div>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block">
                owes you
              </span>
              <span className="text-sm font-bold text-[#059669] dark:text-emerald-400 block font-sans">
                {formatPaise(netPaise)}
              </span>
            </div>
          )}

          {youOwe && (
            <div>
              <span className="text-[11px] font-medium text-red-600 dark:text-red-400 block">
                you owe
              </span>
              <span className="text-sm font-bold text-[#DC2626] dark:text-red-400 block font-sans">
                {formatPaise(Math.abs(netPaise))}
              </span>
            </div>
          )}

          {isSettled && (
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Settled</span>
            </div>
          )}
        </div>

        {!isSettled && onSettle && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSettle(e);
            }}
            className="py-1 px-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[#065F46] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition active:scale-95 shadow-xs"
          >
            Settle
          </button>
        )}
      </div>
    </Link>
  );
}
