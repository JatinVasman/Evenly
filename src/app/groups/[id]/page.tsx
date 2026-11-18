"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { TopHeader } from "@/components/navigation/TopHeader";
import { formatPaise } from "@/lib/utils";
import { Plus, Receipt, CreditCard, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentUser } from "@/context/UserContext";
import { clientCache } from "@/lib/clientCache";

interface GroupDetailData {
  id: string;
  name: string;
  description?: string | null;
  role: string;
  members: Array<{
    userId: string;
    role: string;
    name: string;
    username: string;
    image?: string | null;
  }>;
  expenses: Array<{
    id: string;
    description: string;
    amountPaise: number;
    date: string;
    payer: { id: string; name: string; username: string };
    splits: Array<{
      userId: string;
      amountPaise: number;
      user: { id: string; name: string };
    }>;
  }>;
  settlements: Array<{
    id: string;
    amountPaise: number;
    date: string;
    notes?: string | null;
    payer: { id: string; name: string };
    payee: { id: string; name: string };
  }>;
  memberBalances: Array<{
    userId: string;
    name: string;
    username: string;
    image?: string | null;
    role: string;
    netPaise: number;
  }>;
  totalExpensesPaise: number;
  userNetPaise: number;
}

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = use(params);
  const { user } = useCurrentUser();

  const [group, setGroup] = useState<GroupDetailData | null>(() =>
    clientCache.get<{ group: GroupDetailData }>(`/api/groups/${groupId}`)?.group || null
  );
  const [loading, setLoading] = useState(
    () => !clientCache.get<{ group: GroupDetailData }>(`/api/groups/${groupId}`)
  );
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "settlements">("expenses");

  const loadGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load group");
        return;
      }
      setGroup(data.group);
      clientCache.set(`/api/groups/${groupId}`, data);
      if (typeof window !== "undefined") {
        localStorage.setItem("recently_opened_group_id", data.group.id);
      }
    } catch {
      setError("Network error loading group details");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#065F46]" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-slate-600 text-sm">{error || "Group not found"}</p>
        <Link
          href="/groups"
          className="inline-block px-4 py-2 bg-[#065F46] text-white text-xs font-semibold rounded-xl"
        >
          Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopHeader
        title={group.name}
        subtitle={`${group.members.length} members`}
        showBack
        backHref="/groups"
      />

      <div className="p-4 space-y-4">
        {/* Group Header Hero */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#065F46] font-bold text-lg shadow-xs">
              {group.name.charAt(0)}
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                Total Expenses
              </span>
              <p className="text-xl font-black text-slate-900 font-sans">
                {formatPaise(group.totalExpensesPaise)}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">{group.name}</h2>
            {group.description && (
              <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
            )}
          </div>

          {/* User's Net Status in Group */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Your Group Balance</span>
            <span
              className={`font-black font-sans ${
                group.userNetPaise > 0
                  ? "text-[#059669]"
                  : group.userNetPaise < 0
                  ? "text-red-600"
                  : "text-slate-500"
              }`}
            >
              {group.userNetPaise > 0
                ? `You are owed ${formatPaise(group.userNetPaise)}`
                : group.userNetPaise < 0
                ? `You owe ${formatPaise(Math.abs(group.userNetPaise))}`
                : "All settled up"}
            </span>
          </div>

          <div className="pt-1">
            <Link
              href={`/expenses/new?groupId=${group.id}`}
              className="w-full py-2.5 px-3 bg-[#065F46] hover:bg-[#047857] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add Expense to Group
            </Link>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "expenses"
                ? "border-[#065F46] text-[#065F46]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Expenses ({group.expenses.length})
          </button>
          <button
            onClick={() => setActiveTab("balances")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "balances"
                ? "border-[#065F46] text-[#065F46]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Balances ({group.memberBalances.length})
          </button>
          <button
            onClick={() => setActiveTab("settlements")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "settlements"
                ? "border-[#065F46] text-[#065F46]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Settlements ({group.settlements.length})
          </button>
        </div>

        {/* Tab Content: Expenses */}
        {activeTab === "expenses" && (
          <div className="space-y-2.5">
            {group.expenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No group expenses yet"
                description="Add the first expense for this group to start splitting bills"
                actionLabel="Add Expense"
                actionHref={`/expenses/new?groupId=${group.id}`}
              />
            ) : (
              group.expenses.map((exp) => {
                const isPaidByMe = exp.payer.id === user.id;
                const mySplit = exp.splits.find((s) => s.userId === user.id);

                return (
                  <Link
                    key={exp.id}
                    href={`/expenses/${exp.id}`}
                    className="block p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {exp.description}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {isPaidByMe ? "You paid" : `${exp.payer.name} paid`}{" "}
                          {formatPaise(exp.amountPaise)}
                        </p>
                      </div>

                      {mySplit && (
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-extrabold block font-sans ${
                              isPaidByMe ? "text-[#059669]" : "text-red-500"
                            }`}
                          >
                            {isPaidByMe
                              ? `+${formatPaise(exp.amountPaise - mySplit.amountPaise)}`
                              : `-${formatPaise(mySplit.amountPaise)}`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isPaidByMe ? "you are owed" : "your share"}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Tab Content: Balances */}
        {activeTab === "balances" && (
          <div className="space-y-2">
            {group.memberBalances.map((mb) => {
              const isMe = mb.userId === user.id;
              return (
                <div
                  key={mb.userId}
                  className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          mb.image ||
                          `https://avatar.vercel.sh/${mb.username}.svg`
                        }
                        alt={mb.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {mb.name} {isMe && "(You)"}
                      </p>
                      <p className="text-[10px] text-slate-500">@{mb.username}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-extrabold font-sans block ${
                        mb.netPaise > 0
                          ? "text-[#059669]"
                          : mb.netPaise < 0
                          ? "text-red-500"
                          : "text-slate-400"
                      }`}
                    >
                      {mb.netPaise > 0
                        ? `+${formatPaise(mb.netPaise)}`
                        : mb.netPaise < 0
                        ? formatPaise(mb.netPaise)
                        : "Settled"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {mb.netPaise > 0
                        ? "gets back"
                        : mb.netPaise < 0
                        ? "owes"
                        : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content: Settlements */}
        {activeTab === "settlements" && (
          <div className="space-y-2.5">
            {group.settlements.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No settlements yet"
                description="When members record payments within this group, they will appear here"
              />
            ) : (
              group.settlements.map((st) => (
                <div
                  key={st.id}
                  className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#065F46] border border-emerald-100 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {st.payer.name} paid {st.payee.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(st.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                        {st.notes ? ` • ${st.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-[#065F46] font-sans">
                    {formatPaise(st.amountPaise)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
