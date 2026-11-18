"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopHeader } from "@/components/navigation/TopHeader";
import { formatPaise } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Receipt,
  Users,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useCurrentUser } from "@/context/UserContext";
import { DetailedUserBalances, UserBalanceItem } from "@/lib/money";
import { useSWRQuery } from "@/lib/useSWRQuery";
import { SettleUpModal, SettleUpParticipant } from "@/components/settlement/SettleUpModal";

interface RecentExpenseItem {
  id: string;
  description: string;
  amountPaise: number;
  date: string;
  payer: { id: string; name: string; username: string; image?: string | null };
  group?: { id: string; name: string } | null;
  mySharePaise: number;
}

interface DashboardResponse {
  balanceBreakdown: DetailedUserBalances;
  totalMySharePaise: number;
  recentGroup: {
    id: string;
    name: string;
    description?: string | null;
    membersCount: number;
    expensesCount: number;
    userNetPaise: number;
  } | null;
  recentExpenses: RecentExpenseItem[];
}

export default function HomeDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useCurrentUser();

  const {
    data,
    isLoading,
    isRevalidating,
  } = useSWRQuery<DashboardResponse>(
    "/api/dashboard",
    async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
    { enabled: isAuthenticated, staleTimeMs: 30 * 1000 }
  );

  const [isOwedExpanded, setIsOwedExpanded] = useState(false);
  const [isYouOweExpanded, setIsYouOweExpanded] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleFriend, setSettleFriend] = useState<SettleUpParticipant | null>(null);
  const [settleNetPaise, setSettleNetPaise] = useState(0);

  const openSettleModal = (item: UserBalanceItem | null, net: number) => {
    if (item) {
      setSettleFriend({
        id: item.userId,
        name: item.name,
        username: item.name.toLowerCase().replace(/\s+/g, ""),
        image: item.image,
      });
      setSettleNetPaise(net);
    } else {
      setSettleFriend(null);
      setSettleNetPaise(0);
    }
    setIsSettleModalOpen(true);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const balanceBreakdown = data?.balanceBreakdown || {
    netBalancePaise: 0,
    totalOwedToYouPaise: 0,
    totalYouOwePaise: 0,
    owedToYou: [],
    youOwe: [],
  };

  const visibleOwedToYou = isOwedExpanded
    ? balanceBreakdown.owedToYou
    : balanceBreakdown.owedToYou.slice(0, 3);

  const visibleYouOwe = isYouOweExpanded
    ? balanceBreakdown.youOwe
    : balanceBreakdown.youOwe.slice(0, 3);

  const totalMySharePaise = data?.totalMySharePaise || 0;
  const recentGroup = data?.recentGroup || null;
  const recentExpenses = data?.recentExpenses || [];

  if (authLoading && !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#065F46]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Top Header with Centered Serif Typography */}
      <TopHeader isRevalidating={isRevalidating} />

      <div className="p-4 space-y-4">
        {/* User Greeting */}
        <div className="pt-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Welcome back
          </p>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {user.name.split(" ")[0]} 👋
          </h2>
        </div>

        {/* Hero Financial Balance Card — User-to-User Breakdown */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#065F46] via-[#047857] to-[#022c22] p-5 text-white shadow-xl shadow-emerald-950/20 border border-emerald-500/20">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-emerald-400/10 blur-xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="border-b border-emerald-500/30 pb-3">
              <span className="text-xs font-semibold text-emerald-200/90 tracking-wide uppercase block">
                Total Spent
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 block font-sans">
                {formatPaise(totalMySharePaise)}
              </span>
            </div>

            {/* Individual User Breakdowns: Owed to You & You Owe */}
            <div className="space-y-3 pt-1">
              {isLoading ? (
                <div className="py-6 text-center text-emerald-200/60">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-200" />
                </div>
              ) : balanceBreakdown.owedToYou.length === 0 && balanceBreakdown.youOwe.length === 0 ? (
                <div className="py-4 text-center text-xs text-emerald-100/80 bg-white/5 rounded-2xl border border-white/10">
                  <p className="font-semibold">No outstanding debts!</p>
                  <p className="text-[11px] text-emerald-200/60 mt-0.5">
                    Add expenses or connect with friends to track balances.
                  </p>
                </div>
              ) : (
                <>
                  {/* Section A: Owed to You */}
                  {balanceBreakdown.owedToYou.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-200/90 tracking-wide uppercase px-1">
                        <span>Owed to you</span>
                        <span className="font-sans text-emerald-300">
                          {formatPaise(balanceBreakdown.totalOwedToYouPaise)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {visibleOwedToYou.map((item: UserBalanceItem) => (
                          <Link
                            key={item.userId}
                            href={`/friends/${item.userId}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition group border border-white/10"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full overflow-hidden border border-white/30 shrink-0 bg-emerald-800">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={
                                    item.image ||
                                    `https://avatar.vercel.sh/${item.name}.svg`
                                  }
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="text-xs text-emerald-50 truncate">
                                <span className="font-semibold text-white">
                                  {item.name}
                                </span>{" "}
                                owes you
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold text-emerald-300 font-sans">
                                {formatPaise(item.amountPaise)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openSettleModal(item, item.amountPaise);
                                }}
                                className="px-2 py-0.5 rounded-lg bg-emerald-400/20 hover:bg-emerald-400/35 text-emerald-100 font-bold text-[10px] uppercase tracking-wider transition active:scale-95 border border-emerald-400/30"
                              >
                                Settle
                              </button>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {balanceBreakdown.owedToYou.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setIsOwedExpanded(!isOwedExpanded)}
                          className="text-[11px] font-semibold text-emerald-200 hover:text-white transition flex items-center gap-1 px-1 pt-0.5"
                        >
                          <span>
                            {isOwedExpanded
                              ? "Show less"
                              : `See all (${balanceBreakdown.owedToYou.length})`}
                          </span>
                          {isOwedExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Section B: You Owe */}
                  {balanceBreakdown.youOwe.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-red-200/90 tracking-wide uppercase px-1">
                        <span>You owe</span>
                        <span className="font-sans text-red-300">
                          {formatPaise(balanceBreakdown.totalYouOwePaise)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {visibleYouOwe.map((item: UserBalanceItem) => (
                          <Link
                            key={item.userId}
                            href={`/friends/${item.userId}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition group border border-white/10"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full overflow-hidden border border-white/30 shrink-0 bg-red-950">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={
                                    item.image ||
                                    `https://avatar.vercel.sh/${item.name}.svg`
                                  }
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="text-xs text-red-100 truncate">
                                You owe{" "}
                                <span className="font-semibold text-white">
                                  {item.name}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold text-red-300 font-sans">
                                {formatPaise(item.amountPaise)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openSettleModal(item, -item.amountPaise);
                                }}
                                className="px-2 py-0.5 rounded-lg bg-red-400/20 hover:bg-red-400/35 text-red-100 font-bold text-[10px] uppercase tracking-wider transition active:scale-95 border border-red-400/30"
                              >
                                Settle
                              </button>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {balanceBreakdown.youOwe.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setIsYouOweExpanded(!isYouOweExpanded)}
                          className="text-[11px] font-semibold text-emerald-200 hover:text-white transition flex items-center gap-1 px-1 pt-0.5"
                        >
                          <span>
                            {isYouOweExpanded
                              ? "Show less"
                              : `See all (${balanceBreakdown.youOwe.length})`}
                          </span>
                          {isYouOweExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Settle Up Action Button */}
                  <div className="pt-2 border-t border-emerald-500/20">
                    <button
                      type="button"
                      onClick={() => openSettleModal(null, 0)}
                      className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Record a Settlement</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Group Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Recent Group
            </h3>
            <Link
              href="/groups"
              className="text-xs font-semibold text-[#065F46] dark:text-emerald-400 flex items-center hover:underline"
            >
              All groups
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentGroup ? (
            <Link
              href={`/groups/${recentGroup.id}`}
              className="block p-4 bg-white dark:bg-[#141B18] rounded-2xl border border-slate-200/80 dark:border-[#22302A] shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {recentGroup.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {recentGroup.membersCount} members • {recentGroup.expensesCount} expenses
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-extrabold block font-sans ${
                      recentGroup.userNetPaise > 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : recentGroup.userNetPaise < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {recentGroup.userNetPaise > 0
                      ? `+${formatPaise(recentGroup.userNetPaise)}`
                      : formatPaise(recentGroup.userNetPaise)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {recentGroup.userNetPaise > 0
                      ? "you are owed"
                      : recentGroup.userNetPaise < 0
                      ? "you owe"
                      : "settled"}
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="p-4 bg-white dark:bg-[#141B18] rounded-2xl border border-slate-200/70 dark:border-[#22302A] text-center space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No groups yet.</p>
              <Link
                href="/groups"
                className="inline-block px-3 py-1.5 bg-[#065F46] text-white text-xs font-semibold rounded-xl"
              >
                Create a Group
              </Link>
            </div>
          )}
        </div>

        {/* Recent Expenses Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Recent Expenses
            </h3>
            <Link
              href="/activity"
              className="text-xs font-semibold text-[#065F46] dark:text-emerald-400 flex items-center hover:underline"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentExpenses.length === 0 ? (
              <div className="p-4 bg-white dark:bg-[#141B18] rounded-2xl border border-slate-200/70 dark:border-[#22302A] text-center text-xs text-slate-400 dark:text-slate-500">
                No recent expenses yet
              </div>
            ) : (
              recentExpenses.map((exp) => {
                const formattedDate = new Date(exp.date).toLocaleDateString(
                  "en-IN",
                  {
                    month: "short",
                    day: "numeric",
                  }
                );
                const isPayerCurrentUser = exp.payer.id === user.id;

                return (
                  <Link
                    key={exp.id}
                    href={`/expenses/${exp.id}`}
                    className="p-3.5 bg-white dark:bg-[#141B18] rounded-2xl border border-slate-200/70 dark:border-[#22302A] shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition block group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-emerald-50 text-[#065F46] border-emerald-100 group-hover:bg-emerald-100 transition">
                        <Receipt className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {exp.description}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {exp.group?.name ? `${exp.group.name} • ` : "Direct • "}
                          {isPayerCurrentUser ? "You paid" : `${exp.payer.name.split(" ")[0]} paid`} • {formattedDate}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white block font-sans">
                        {formatPaise(exp.amountPaise)}
                      </span>
                      {exp.mySharePaise > 0 && !isPayerCurrentUser && (
                        <span className="text-[10px] text-red-500 font-medium block">
                          your share {formatPaise(exp.mySharePaise)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Settle Up Action Modal */}
      <SettleUpModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        friend={settleFriend}
        netPaise={settleNetPaise}
      />
    </div>
  );
}
