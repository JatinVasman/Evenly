"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { TopHeader } from "@/components/navigation/TopHeader";
import { Button } from "@/components/ui/Button";
import { SettleUpModal } from "@/components/settlement/SettleUpModal";
import { formatPaise } from "@/lib/utils";
import { Plus, CreditCard, CheckCircle2, Receipt, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentUser } from "@/context/UserContext";
import { User } from "@/types";
import { clientCache } from "@/lib/clientCache";

interface FriendDetailResponse {
  friend: {
    id: string;
    name: string;
    username: string;
    image?: string | null;
  };
  friendshipStatus: string;
  friendshipId?: string;
  balance: {
    otherUserId: string;
    netPaise: number;
    theyOwePaise: number;
    youOwePaise: number;
  };
  sharedExpenses: Array<{
    id: string;
    description: string;
    amountPaise: number;
    date: string;
    payer: { id: string; name: string };
    group?: { id: string; name: string } | null;
    splits: Array<{
      userId: string;
      amountPaise: number;
      user: { id: string; name: string };
    }>;
  }>;
  sharedSettlements: Array<{
    id: string;
    amountPaise: number;
    date: string;
    notes?: string | null;
    payer: { id: string; name: string };
    payee: { id: string; name: string };
  }>;
}

export default function FriendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: friendId } = use(params);
  const { user } = useCurrentUser();

  const [data, setData] = useState<FriendDetailResponse | null>(() =>
    clientCache.get<FriendDetailResponse>(`/api/friends/${friendId}`)
  );
  const [loading, setLoading] = useState(
    () => !clientCache.get<FriendDetailResponse>(`/api/friends/${friendId}`)
  );
  const [activeTab, setActiveTab] = useState<"expenses" | "settlements">("expenses");
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  const loadFriendData = useCallback(async () => {
    try {
      const res = await fetch(`/api/friends/${friendId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        clientCache.set(`/api/friends/${friendId}`, json);
      }
    } catch (err) {
      console.error("Failed to fetch friend detail:", err);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    loadFriendData();
  }, [loadFriendData]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#065F46]" />
      </div>
    );
  }

  if (!data || !data.friend) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-slate-500 text-sm">Friend not found.</p>
        <Link
          href="/friends"
          className="inline-block px-4 py-2 bg-[#065F46] text-white text-xs font-semibold rounded-xl"
        >
          Back to Friends
        </Link>
      </div>
    );
  }

  const { friend, balance, sharedExpenses, sharedSettlements } = data;
  const owesYou = balance.netPaise > 0;
  const youOwe = balance.netPaise < 0;
  const isSettled = balance.netPaise === 0;

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopHeader
        title={friend.name}
        subtitle={`@${friend.username}`}
        showBack
        backHref="/friends"
      />

      <div className="p-4 space-y-4">
        {/* Friend Profile & Balance Hero */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 mx-auto shadow-xs bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={friend.image || `https://avatar.vercel.sh/${friend.username}.svg`}
              alt={friend.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">{friend.name}</h2>
            <p className="text-xs text-slate-500 font-medium">@{friend.username}</p>
          </div>

          {/* Balance Callout */}
          <div className="pt-2">
            {owesYou && (
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  Owes you
                </span>
                <p className="text-2xl font-black text-[#059669] mt-0.5 font-sans">
                  {formatPaise(balance.netPaise)}
                </p>
              </div>
            )}

            {youOwe && (
              <div>
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                  You owe
                </span>
                <p className="text-2xl font-black text-red-600 mt-0.5 font-sans">
                  {formatPaise(balance.youOwePaise)}
                </p>
              </div>
            )}

            {isSettled && (
              <div className="flex items-center justify-center gap-1.5 text-slate-500 py-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold">All settled up</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettleModalOpen(true)}
              className="w-full text-xs font-semibold"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#065F46] mr-1.5" />
              Settle Up
            </Button>

            <Link
              href={`/expenses/new?friendId=${friend.id}`}
              className="w-full py-2 px-3 bg-[#065F46] hover:bg-[#047857] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Expense
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
            Shared Expenses ({sharedExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab("settlements")}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "settlements"
                ? "border-[#065F46] text-[#065F46]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Settlements ({sharedSettlements.length})
          </button>
        </div>

        {/* Tab Content: Expenses */}
        {activeTab === "expenses" && (
          <div className="space-y-2.5">
            {sharedExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No shared expenses"
                description={`You haven't split any expenses with ${friend.name} yet.`}
                actionLabel="Add Expense"
                actionHref={`/expenses/new?friendId=${friend.id}`}
              />
            ) : (
              sharedExpenses.map((exp) => {
                const isPaidByMe = exp.payer.id === user.id;
                const mySplit = exp.splits.find((s) => s.userId === user.id);
                const friendSplit = exp.splits.find((s) => s.userId === friend.id);

                let lentOrBorrowedText = "";
                let lentOrBorrowedAmount = 0;
                let isLent = false;

                if (isPaidByMe && friendSplit) {
                  isLent = true;
                  lentOrBorrowedAmount = friendSplit.amountPaise;
                  lentOrBorrowedText = `you lent ${friend.name.split(" ")[0]}`;
                } else if (!isPaidByMe && mySplit) {
                  isLent = false;
                  lentOrBorrowedAmount = mySplit.amountPaise;
                  lentOrBorrowedText = `you borrowed`;
                }

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
                          {exp.group ? ` in ${exp.group.name}` : ""}
                        </p>
                      </div>

                      {lentOrBorrowedAmount > 0 && (
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-extrabold block font-sans ${
                              isLent ? "text-[#059669]" : "text-red-500"
                            }`}
                          >
                            {isLent ? "+" : "-"}
                            {formatPaise(lentOrBorrowedAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {lentOrBorrowedText}
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

        {/* Tab Content: Settlements */}
        {activeTab === "settlements" && (
          <div className="space-y-2.5">
            {sharedSettlements.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No settlements recorded"
                description={`No payment records between you and ${friend.name}.`}
                actionLabel="Record Payment"
                onAction={() => setIsSettleModalOpen(true)}
              />
            ) : (
              sharedSettlements.map((st) => {
                const iPaid = st.payer.id === user.id;
                return (
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
                          {iPaid ? `You paid ${friend.name}` : `${friend.name} paid you`}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(st.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {st.notes ? ` • ${st.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#065F46] font-sans">
                      {formatPaise(st.amountPaise)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Settle Up Modal */}
      <SettleUpModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        friend={friend as unknown as User}
        netPaise={balance.netPaise}
        onSettled={loadFriendData}
      />
    </div>
  );
}
