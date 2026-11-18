"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { User } from "@/types";
import { formatPaise, parseRupeesToPaise } from "@/lib/utils";
import { Check, ArrowRight, Loader2, CreditCard, Banknote, Smartphone } from "lucide-react";
import { useCurrentUser } from "@/context/UserContext";
import { invalidateCache } from "@/lib/useSWRQuery";
import { clientCache } from "@/lib/clientCache";

export interface SettleUpParticipant {
  id: string;
  name: string;
  username: string;
  image?: string | null;
}

export interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend?: User | SettleUpParticipant | null;
  groupId?: string | null;
  groupMembers?: Array<{ userId: string; name: string; username: string; image?: string | null }>;
  netPaise?: number; // Balance with friend: >0 they owe you, <0 you owe them
  onSettled?: () => void;
}

const PAYMENT_METHODS = [
  { label: "UPI / GPay", icon: Smartphone },
  { label: "Cash", icon: Banknote },
  { label: "Bank Transfer", icon: CreditCard },
];

export function SettleUpModal({
  isOpen,
  onClose,
  friend: initialFriend,
  groupId,
  groupMembers,
  netPaise: initialNetPaise = 0,
  onSettled,
}: SettleUpModalProps) {
  const { user } = useCurrentUser();

  // Selected friend/participant to settle with
  const [selectedFriend, setSelectedFriend] = useState<SettleUpParticipant | null>(
    (initialFriend as SettleUpParticipant) || null
  );

  // Available friends/members to pick from if not pre-specified
  const [availableFriends, setAvailableFriends] = useState<SettleUpParticipant[]>([]);

  // Direction: true = I paid them; false = they paid me
  const [youPaid, setYouPaid] = useState<boolean>(() => initialNetPaise < 0);
  const [amountStr, setAmountStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI / GPay");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const debtPaise = Math.abs(initialNetPaise);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (!isOpen) return;

    if (initialFriend) {
      setSelectedFriend(initialFriend as SettleUpParticipant);
    } else if (groupMembers && groupMembers.length > 0) {
      const otherMembers = groupMembers
        .filter((m) => m.userId !== user?.id)
        .map((m) => ({ id: m.userId, name: m.name, username: m.username, image: m.image }));
      setAvailableFriends(otherMembers);
      if (otherMembers.length > 0) {
        setSelectedFriend(otherMembers[0]);
      }
    } else {
      // Load friends from client cache or API
      const cached = clientCache.get<{ friends?: Array<{ user: SettleUpParticipant }> }>("/api/friends")?.friends;
      if (cached && cached.length > 0) {
        const list = cached.map((f) => f.user);
        setAvailableFriends(list);
        setSelectedFriend(list[0]);
      } else {
        fetch("/api/friends")
          .then((r) => r.json())
          .then((data) => {
            if (data?.friends?.length > 0) {
              const list = data.friends.map((f: { user: SettleUpParticipant }) => f.user);
              setAvailableFriends(list);
              setSelectedFriend(list[0]);
              clientCache.set("/api/friends", data);
            }
          })
          .catch(() => {});
      }
    }

    setYouPaid(initialNetPaise < 0);
    if (debtPaise > 0) {
      setAmountStr((debtPaise / 100).toFixed(2));
    } else {
      setAmountStr("");
    }
    setDateStr(new Date().toISOString().split("T")[0]);
    setNote("");
    setPaymentMethod("UPI / GPay");
    setError(null);
    setSuccessMsg(false);
  }, [isOpen, initialFriend, groupMembers, initialNetPaise, debtPaise, user?.id]);

  if (!isOpen) return null;

  const targetName = selectedFriend?.name || "Friend";
  const payerId = youPaid ? user?.id : selectedFriend?.id;
  const payeeId = youPaid ? selectedFriend?.id : user?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFriend?.id) {
      setError("Please select a person to settle with");
      return;
    }

    const paise = parseRupeesToPaise(amountStr);
    if (paise <= 0) {
      setError("Please enter an amount greater than ₹0");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const fullNote = [paymentMethod, note.trim()].filter(Boolean).join(" • ");

    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId,
          payeeId,
          amountPaise: paise,
          date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
          notes: fullNote || undefined,
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
      description="Record payments or settle debts made outside Evenly"
    >
      {successMsg ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#065F46] dark:text-emerald-300 flex items-center justify-center mx-auto animate-in zoom-in-75">
            <Check className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Settlement Recorded!</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Balances and ledger have been successfully reconciled.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Friend Selector if not pre-specified */}
          {!initialFriend && availableFriends.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Settle with
              </label>
              <select
                value={selectedFriend?.id || ""}
                onChange={(e) => {
                  const found = availableFriends.find((f) => f.id === e.target.value);
                  if (found) setSelectedFriend(found);
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A2420] border border-slate-200 dark:border-[#22302A] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableFriends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (@{f.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Direction Toggle Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Who paid whom?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setYouPaid(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1.5 ${
                  youPaid
                    ? "bg-[#065F46] text-white border-[#065F46] shadow-sm"
                    : "bg-slate-50 dark:bg-[#1A2420] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#22302A] hover:bg-slate-100"
                }`}
              >
                <span>You paid {targetName}</span>
              </button>

              <button
                type="button"
                onClick={() => setYouPaid(false)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1.5 ${
                  !youPaid
                    ? "bg-[#065F46] text-white border-[#065F46] shadow-sm"
                    : "bg-slate-50 dark:bg-[#1A2420] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#22302A] hover:bg-slate-100"
                }`}
              >
                <span>{targetName} paid You</span>
              </button>
            </div>
          </div>

          {/* Visual Transaction Summary Pill */}
          <div className="p-3 bg-slate-50 dark:bg-[#1A2420] border border-slate-200/80 dark:border-[#22302A] rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                {youPaid ? "You" : targetName}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-900 dark:text-white">
                {youPaid ? targetName : "You"}
              </span>
            </div>
            {debtPaise > 0 && (
              <span className="font-extrabold text-[#065F46] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
                Outstanding: {formatPaise(debtPaise)}
              </span>
            )}
          </div>

          {/* Payment Amount & One-tap Full Settle Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Amount (₹)
              </label>
              {debtPaise > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountStr((debtPaise / 100).toFixed(2))}
                  className="text-[11px] font-bold text-[#065F46] dark:text-emerald-400 hover:underline"
                >
                  Settle Full ({formatPaise(debtPaise)})
                </button>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Payment Method Quick Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Payment Method
            </label>
            <div className="flex gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.label;
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setPaymentMethod(m.label)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition active:scale-95 ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                        : "bg-slate-50 dark:bg-[#1A2420] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#22302A]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Note Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-[#1A2420] border border-slate-200 dark:border-[#22302A] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reference / note"
                className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-[#1A2420] border border-slate-200 dark:border-[#22302A] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
          )}

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
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#065F46] hover:bg-[#047857] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Record Settlement</span>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
