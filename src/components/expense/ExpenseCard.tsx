import React from "react";
import Link from "next/link";
import { Receipt, Users } from "lucide-react";
import { Expense } from "@/types";
import { formatPaise } from "@/lib/utils";
import { CURRENT_USER } from "@/lib/mockData";

export interface ExpenseCardProps {
  expense: Expense;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const isPayer = expense.paidById === CURRENT_USER.id;
  const userSplit = expense.splits?.find((s) => s.userId === CURRENT_USER.id);
  const userSplitAmount = userSplit ? userSplit.amountPaise : 0;

  // Financial relationship calculation
  let relationshipText = "";
  let amountText = "";
  let isPositive = false;
  let isNegative = false;

  if (isPayer) {
    const lentAmount = expense.totalAmountPaise - userSplitAmount;
    if (lentAmount > 0) {
      isPositive = true;
      relationshipText = "you lent";
      amountText = formatPaise(lentAmount);
    } else {
      relationshipText = "you paid for yourself";
      amountText = formatPaise(expense.totalAmountPaise);
    }
  } else if (userSplitAmount > 0) {
    isNegative = true;
    relationshipText = "you borrowed";
    amountText = formatPaise(userSplitAmount);
  } else {
    relationshipText = "not involved";
    amountText = formatPaise(expense.totalAmountPaise);
  }

  const formattedDate = new Date(expense.expenseDate).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/expenses/${expense.id}`}
      className="block bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-[#065F46] shrink-0">
            <Receipt className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 truncate">
              {expense.title}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span>{formattedDate}</span>
              {expense.group && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate text-slate-600">
                    <Users className="w-3 h-3 shrink-0" />
                    {expense.group.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`text-xs block font-medium capitalize ${
              isPositive
                ? "text-emerald-700"
                : isNegative
                ? "text-red-600"
                : "text-slate-500"
            }`}
          >
            {relationshipText}
          </span>
          <span
            className={`text-sm font-bold block ${
              isPositive
                ? "text-[#059669]"
                : isNegative
                ? "text-[#DC2626]"
                : "text-slate-800"
            }`}
          >
            {amountText}
          </span>
        </div>
      </div>
    </Link>
  );
}
