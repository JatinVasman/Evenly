import React from "react";
import { User, Group } from "@/types";
import { formatPaise } from "@/lib/utils";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { simplifyGroupDebts } from "@/lib/money";

export interface MemberBalancesCardProps {
  group: Group;
  memberBalances: Array<{ user: User; netPaise: number }>;
}

export function MemberBalancesCard({ group, memberBalances }: MemberBalancesCardProps) {
  // Compute simplified debt settlement paths
  const simplifiedDebts = simplifyGroupDebts(
    memberBalances.map((mb) => ({
      userId: mb.user.id,
      netPaise: mb.netPaise,
    }))
  );

  const getUser = (id: string) =>
    memberBalances.find((mb) => mb.user.id === id)?.user || {
      id,
      name: "Member",
      username: "user",
      email: "",
      createdAt: "",
      updatedAt: "",
    };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Member Balances
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Current standings within {group.name}
        </p>
      </div>

      {/* Individual member standing list */}
      <div className="space-y-2.5">
        {memberBalances.map(({ user, netPaise }) => {
          const isPositive = netPaise > 0;
          const isNegative = netPaise < 0;
          const isZero = netPaise === 0;

          return (
            <div
              key={user.id}
              className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.image || `https://avatar.vercel.sh/${user.username}.svg`}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-slate-500">@{user.username}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                {isPositive && (
                  <span className="text-xs font-bold text-[#059669]">
                    + {formatPaise(netPaise)}
                  </span>
                )}
                {isNegative && (
                  <span className="text-xs font-bold text-[#DC2626]">
                    - {formatPaise(Math.abs(netPaise))}
                  </span>
                )}
                {isZero && (
                  <span className="text-xs font-medium text-slate-400">
                    Settled
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Settlements Section */}
      <div className="pt-2 border-t border-slate-100">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Suggested Settlements
        </h4>

        {simplifiedDebts.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Everyone in this group is settled up!</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {simplifiedDebts.map((debt, idx) => {
              const debtor = getUser(debt.fromUserId);
              const creditor = getUser(debt.toUserId);

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-slate-900 truncate">
                      {debtor.name}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-900 truncate">
                      {creditor.name}
                    </span>
                  </div>

                  <span className="font-bold text-slate-900 shrink-0 ml-2">
                    {formatPaise(debt.amountPaise)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
