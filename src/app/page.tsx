"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopHeader } from "@/components/navigation/TopHeader";
import { formatPaise } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Receipt,
  CreditCard,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { useCurrentUser } from "@/context/UserContext";
import { DetailedUserBalances, UserBalanceItem } from "@/lib/money";

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
  recentActivities: Array<{
    id: string;
    actorId: string;
    actor: { id: string; name: string; username: string; image?: string | null };
    actionType: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }>;
}

export default function HomeDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useCurrentUser();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isOwedExpanded, setIsOwedExpanded] = useState(false);
  const [isYouOweExpanded, setIsYouOweExpanded] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard();
    }
  }, [isAuthenticated, loadDashboard]);

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
  const recentActivities = data?.recentActivities || [];

  const getActivityDetails = (act: DashboardResponse["recentActivities"][number]) => {
    const isActorCurrentUser = act.actorId === user.id;
    const actorName = isActorCurrentUser ? "You" : act.actor?.name || "User";

    switch (act.actionType) {
      case "EXPENSE_ADDED":
        return {
          icon: Receipt,
          iconBg: "bg-emerald-50 text-[#065F46] border-emerald-100",
          title: `${actorName} added "${act.metadata?.title || "an expense"}"`,
          subtitle: act.metadata?.groupName
            ? `in ${act.metadata.groupName}`
            : "Direct expense",
          badge: act.metadata?.amountPaise
            ? formatPaise(act.metadata.amountPaise as number)
            : undefined,
        };
      case "SETTLEMENT_RECORDED":
        return {
          icon: CreditCard,
          iconBg: "bg-emerald-100 text-[#064E3B] border-emerald-200",
          title: isActorCurrentUser
            ? `You paid ${act.metadata?.toUserName || "a friend"}`
            : `${actorName} recorded a payment`,
          subtitle: (act.metadata?.note as string) || "Settlement recorded",
          badge: act.metadata?.amountPaise
            ? formatPaise(act.metadata.amountPaise as number)
            : undefined,
        };
      case "GROUP_CREATED":
        return {
          icon: Users,
          iconBg: "bg-emerald-50 text-[#065F46] border-emerald-100",
          title: `${actorName} created "${act.metadata?.groupName || "New Group"}"`,
          subtitle: `${act.metadata?.membersCount || 0} members invited`,
        };
      case "FRIEND_REQUEST_ACCEPTED":
        return {
          icon: CheckCircle2,
          iconBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
          title: `${actorName} accepted friend request`,
          subtitle: "Connected as friends",
        };
      default:
        return {
          icon: Clock,
          iconBg: "bg-slate-50 text-slate-700 border-slate-200",
          title: `${actorName} performed an action`,
          subtitle: "Account activity",
        };
    }
  };

  if (authLoading || (!isAuthenticated && typeof window !== "undefined")) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#065F46]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Top Header with Centered Serif Typography */}
      <TopHeader />

      <div className="p-4 space-y-4">
        {/* User Greeting & Total Spent Stats */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Welcome back
            </p>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {user.name.split(" ")[0]} 👋
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-500 block">
              Total Spent
            </span>
            <span className="text-base font-extrabold text-slate-900 font-sans">
              {formatPaise(totalMySharePaise)}
            </span>
          </div>
        </div>

        {/* Hero Financial Balance Card — User-to-User Breakdown */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#065F46] via-[#047857] to-[#022c22] p-5 text-white shadow-xl shadow-emerald-950/20 border border-emerald-500/20">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-emerald-400/10 blur-xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <div>
                <span className="text-xs font-semibold text-emerald-200/90 tracking-wide uppercase block">
                  Total Net Balance
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 block font-sans">
                  {balanceBreakdown.netBalancePaise > 0
                    ? `+${formatPaise(balanceBreakdown.netBalancePaise)}`
                    : formatPaise(balanceBreakdown.netBalancePaise)}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    balanceBreakdown.netBalancePaise > 0
                      ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                      : balanceBreakdown.netBalancePaise < 0
                      ? "bg-red-400/20 text-red-200 border border-red-400/30"
                      : "bg-white/10 text-emerald-100"
                  }`}
                >
                  {balanceBreakdown.netBalancePaise > 0 ? (
                    <>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>You get back</span>
                    </>
                  ) : balanceBreakdown.netBalancePaise < 0 ? (
                    <>
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>You owe</span>
                    </>
                  ) : (
                    <span>All settled up</span>
                  )}
                </span>
              </div>
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
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-bold text-emerald-300 font-sans">
                                {formatPaise(item.amountPaise)}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-emerald-300/60 group-hover:text-white transition" />
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
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-bold text-red-300 font-sans">
                                {formatPaise(item.amountPaise)}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-emerald-400/60 group-hover:text-red-200 transition" />
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Group Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Group
            </h3>
            <Link
              href="/groups"
              className="text-xs font-semibold text-[#065F46] flex items-center hover:underline"
            >
              All groups
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentGroup ? (
            <Link
              href={`/groups/${recentGroup.id}`}
              className="block p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {recentGroup.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {recentGroup.membersCount} members • {recentGroup.expensesCount} expenses
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-extrabold block font-sans ${
                      recentGroup.userNetPaise > 0
                        ? "text-emerald-700"
                        : recentGroup.userNetPaise < 0
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    {recentGroup.userNetPaise > 0
                      ? `+${formatPaise(recentGroup.userNetPaise)}`
                      : formatPaise(recentGroup.userNetPaise)}
                  </span>
                  <span className="text-[10px] text-slate-400">
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
            <div className="p-4 bg-white rounded-2xl border border-slate-200/70 text-center space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs text-slate-500">No groups yet.</p>
              <Link
                href="/groups"
                className="inline-block px-3 py-1.5 bg-[#065F46] text-white text-xs font-semibold rounded-xl"
              >
                Create a Group
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Activity
            </h3>
            <Link
              href="/activity"
              className="text-xs font-semibold text-[#065F46] flex items-center hover:underline"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentActivities.length === 0 ? (
              <div className="p-4 bg-white rounded-2xl border border-slate-200/70 text-center text-xs text-slate-400">
                No recent activity yet
              </div>
            ) : (
              recentActivities.slice(0, 4).map((act) => {
                const details = getActivityDetails(act);
                const Icon = details.icon;
                const formattedDate = new Date(act.createdAt).toLocaleDateString(
                  "en-IN",
                  {
                    month: "short",
                    day: "numeric",
                  }
                );

                return (
                  <div
                    key={act.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${details.iconBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {details.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {details.subtitle} • {formattedDate}
                        </p>
                      </div>
                    </div>

                    {details.badge && (
                      <span className="text-xs font-bold text-slate-900 shrink-0 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-lg">
                        {details.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
