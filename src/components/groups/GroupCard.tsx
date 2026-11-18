import React from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Group } from "@/types";
import { formatPaise } from "@/lib/utils";

export interface GroupCardProps {
  group: Group;
  netPaise: number; // your balance in this group
}

export function GroupCard({ group, netPaise }: GroupCardProps) {
  const owesYou = netPaise > 0;
  const youOwe = netPaise < 0;
  const isSettled = netPaise === 0;

  return (
    <Link
      href={`/groups/${group.id}`}
      className="block p-4 bg-white rounded-2xl border border-slate-200/70 shadow-xs hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#065F46] font-bold text-base shrink-0 shadow-xs">
            {group.name.charAt(0)}
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {group.name}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <Users className="w-3.5 h-3.5" />
              <span>{group.members?.length || 0} members</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          {owesYou && (
            <div>
              <span className="text-[11px] font-medium text-emerald-700 block">
                you are owed
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
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Settled
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
