"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopHeader } from "@/components/navigation/TopHeader";
import { Button } from "@/components/ui/Button";
import { formatPaise } from "@/lib/utils";
import { Receipt, Calendar, Users, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useCurrentUser } from "@/context/UserContext";
import { invalidateCache } from "@/lib/useSWRQuery";

interface ExpenseDetail {
  id: string;
  description: string;
  amountPaise: number;
  date: string;
  splitType: string;
  notes?: string | null;
  payer: { id: string; name: string; username: string; image?: string | null };
  group?: { id: string; name: string } | null;
  splits: Array<{
    userId: string;
    amountPaise: number;
    user: { id: string; name: string; username: string; image?: string | null };
  }>;
}

export default function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: expenseId } = use(params);
  const router = useRouter();
  const { user } = useCurrentUser();

  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpense = useCallback(async () => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Expense not found");
        return;
      }
      setExpense(data.expense);
    } catch {
      setError("Network error loading expense details");
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    loadExpense();
  }, [loadExpense]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        invalidateCache();
        if (expense?.group) {
          router.push(`/groups/${expense.group.id}`);
        } else {
          router.push("/");
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete expense");
        setIsDeleting(false);
      }
    } catch {
      setError("Network error deleting expense");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#065F46]" />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-slate-600 text-sm">{error || "Expense not found"}</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-[#065F46] text-white text-xs font-semibold rounded-xl"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(expense.date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isPayer = expense.payer.id === user.id;

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopHeader
        title="Expense Details"
        showBack
        backHref="/"
        rightAction={
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-50 transition active:scale-95"
            aria-label="Delete expense"
            title="Delete Expense"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        }
      />

      <div className="p-4 space-y-4 flex-1">
        {/* Main Hero Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#065F46] mx-auto shadow-xs">
            <Receipt className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {expense.description}
            </h2>
            {expense.notes && (
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {expense.notes}
              </p>
            )}
          </div>

          <div className="pt-2">
            <span className="text-3xl font-extrabold text-[#065F46] tracking-tight font-sans">
              {formatPaise(expense.amountPaise)}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3 text-xs text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formattedDate}
            </span>
            {expense.group && (
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <Users className="w-3.5 h-3.5" />
                {expense.group.name}
              </span>
            )}
          </div>
        </div>

        {/* Payer Information */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Paid By
          </span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  expense.payer.image ||
                  `https://avatar.vercel.sh/${expense.payer.username}.svg`
                }
                alt={expense.payer.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-bold text-slate-900">
              {isPayer ? "You" : expense.payer.name}
            </span>
          </div>
        </div>

        {/* Splits Breakdown */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Participants & Shares ({expense.splits.length})
            </span>
            <span className="text-[11px] font-bold text-[#065F46] bg-emerald-50 px-2 py-0.5 rounded">
              {expense.splitType} SPLIT
            </span>
          </div>

          <div className="space-y-2">
            {expense.splits.map((s) => {
              const isMe = s.userId === user.id;

              return (
                <div
                  key={s.userId}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          s.user.image ||
                          `https://avatar.vercel.sh/${s.user.username}.svg`
                        }
                        alt={s.user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-slate-800 font-medium">
                      {s.user.name} {isMe && "(You)"}
                    </span>
                  </div>
                  <span className="font-extrabold text-slate-900 font-sans">
                    {formatPaise(s.amountPaise)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-xs w-full space-y-4 shadow-xl text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Expense?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  This will remove the expense and recalculate all affected balances.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 border-red-600"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
