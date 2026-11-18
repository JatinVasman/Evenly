"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { User } from "@/types";
import { formatPaise, parseRupeesToPaise } from "@/lib/utils";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/context/UserContext";
import { invalidateCache } from "@/lib/useSWRQuery";

export interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend?: User | null;
  groupId?: string | null;
  netPaise?: number; // Balance with friend: >0 they owe you, <0 you owe them
  onSettled?: () => void;
}

export function SettleUpModal({
  isOpen,
  onClose,
  friend,
  groupId,
  netPaise = 0,
  onSettled,
}: SettleUpModalProps) {
  const { user } = useCurrentUser();
  const youOweThem = netPaise < 0;
  const debtPaise = Math.abs(netPaise);

  const [amountStr, setAmountStr] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debtPaise > 0) {
      setAmountStr((debtPaise / 100).toFixed(2));
    } else {
      setAmountStr("");
    }
    setNote("");
    setError(null);
    setSuccessMsg(false);
  }, [debtPaise, isOpen]);

  if (!friend) return null;

  const payerId = youOweThem ? user.id : friend.id;
  const payeeId = youOweThem ? friend.id : user.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = parseRupeesToPaise(amountStr);

    if (paise <= 0) {
      setError("Please enter an amount greater than ₹0");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId,
          payeeId,
          amountPaise: paise,
          notes: note.trim() || undefined,
          groupId: groupId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to record settlement");
        setIsSubmitting(false);
        return;
      }

      invalidateCache();
      setSuccessMsg(true);
      if (onSettled) {
        onSettled();
      }

      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
      }, 1200);
    } catch {
      setError("Network error while recording settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Settlement"
      description={`Record payment between you and ${friend.name}`}
    >
      {successMsg ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#065F46] flex items-center justify-center mx-auto animate-in zoom-in-75">
            <Check className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Settlement Recorded!</h4>
          <p className="text-xs text-slate-500">Balances have been reconciled.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                {youOweThem ? "You" : friend.name}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-900">
                {youOweThem ? friend.name : "You"}
              </span>
            </div>
            {debtPaise > 0 && (
              <span className="font-extrabold text-[#065F46] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                Total Debt: {formatPaise(debtPaise)}
              </span>
            )}
          </div>

          <Input
            label="Payment Amount (₹)"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder=""
            helperText="Enter full or partial payment amount made outside Evenly"
          />

          <Input
            label="Note (Optional)"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder=""
          />

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Record Payment</span>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
