import React from "react";
import Link from "next/link";
import { User } from "@/types";
import { formatPaise } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export interface FriendCardProps {
  user: User;
  netPaise: number; // positive = they owe you; negative = you owe them; 0 = settled
}

export function FriendCard({ user, netPaise }: FriendCardProps) {
  const owesYou = netPaise > 0;
  const youOwe = netPaise < 0;
  const isSettled = netPaise === 0;

  return (
    <Link
      href={`/friends/${user.id}`}
      className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/70 shadow-xs hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-11 h-11 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.image || `https://avatar.vercel.sh/${user.username}.svg`}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 truncate">
            {user.name}
          </h4>
          <p className="text-xs text-slate-500 font-medium">@{user.username}</p>
        </div>
      </div>

      <div className="text-right shrink-0">
        {owesYou && (
          <div>
            <span className="text-[11px] font-medium text-emerald-700 block">
              owes you
            </span>
            <span className="text-sm font-bold text-[#059669] block">
              {formatPaise(netPaise)}
            </span>
          </div>
        )}

        {youOwe && (
          <div>
            <span className="text-[11px] font-medium text-red-600 block">
              you owe
            </span>
            <span className="text-sm font-bold text-[#DC2626] block">
              {formatPaise(Math.abs(netPaise))}
            </span>
          </div>
        )}

        {isSettled && (
          <div className="flex items-center gap-1 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-slate-500">Settled</span>
          </div>
        )}
      </div>
    </Link>
  );
}
