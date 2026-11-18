"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopHeader } from "@/components/navigation/TopHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  parseRupeesToPaise,
  formatPaise,
  paiseToInputString,
} from "@/lib/utils";
import { calculateEqualSplit, validateCustomSplit } from "@/lib/money";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { SplitType, User as UserType } from "@/types";
import { useCurrentUser } from "@/context/UserContext";

interface GroupOption {
  id: string;
  name: string;
  members: Array<{
    userId: string;
    name: string;
    username: string;
    image?: string | null;
  }>;
}

interface FriendOption {
  user: {
    id: string;
    name: string;
    username: string;
    image?: string | null;
  };
}

function NewExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryGroupId = searchParams.get("groupId");
  const queryFriendId = searchParams.get("friendId");

  const { user } = useCurrentUser();

  // Data fetching
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expenseTargetType, setExpenseTargetType] = useState<"group" | "individual">(
    queryFriendId ? "individual" : "group"
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedFriendId, setSelectedFriendId] = useState<string>("");
  const [paidById, setPaidById] = useState<string>("");
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");

  // Selected participant IDs for split
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Custom split amounts (userId -> string)
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch groups and friends on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [groupsRes, friendsRes] = await Promise.all([
          fetch("/api/groups"),
          fetch("/api/friends"),
        ]);
        const groupsData = await groupsRes.json();
        const friendsData = await friendsRes.json();

        const grpList: GroupOption[] = groupsData.groups || [];
        const frndList: FriendOption[] = friendsData.friends || [];

        setGroups(grpList);
        setFriends(frndList);

        // Pre-select target
        if (queryGroupId && grpList.some((g) => g.id === queryGroupId)) {
          setExpenseTargetType("group");
          setSelectedGroupId(queryGroupId);
          const grp = grpList.find((g) => g.id === queryGroupId)!;
          const memberIds = grp.members.map((m) => m.userId);
          setSelectedParticipants(memberIds);
        } else if (queryFriendId && frndList.some((f) => f.user.id === queryFriendId)) {
          setExpenseTargetType("individual");
          setSelectedFriendId(queryFriendId);
          setSelectedParticipants([user.id, queryFriendId]);
        } else if (grpList.length > 0) {
          setExpenseTargetType("group");
          setSelectedGroupId(grpList[0].id);
          const memberIds = grpList[0].members.map((m) => m.userId);
          setSelectedParticipants(memberIds);
        } else if (frndList.length > 0) {
          setExpenseTargetType("individual");
          setSelectedFriendId(frndList[0].user.id);
          setSelectedParticipants([user.id, frndList[0].user.id]);
        }
      } catch (err) {
        console.error("Failed to load expense creation context:", err);
      } finally {
        setIsLoadingData(false);
      }
    }

    if (user?.id) {
      setPaidById(user.id);
      loadInitialData();
    }
  }, [user?.id, queryGroupId, queryFriendId]);

  // Available participants based on target type
  const availableParticipants: UserType[] = useMemo(() => {
    if (expenseTargetType === "group") {
      const group = groups.find((g) => g.id === selectedGroupId);
      if (!group || !group.members) return [user];
      return group.members.map((m) => ({
        id: m.userId,
        name: m.name,
        username: m.username,
        email: "",
        image: m.image,
        createdAt: "",
        updatedAt: "",
      }));
    } else {
      const friendObj = friends.find((f) => f.user.id === selectedFriendId);
      return friendObj ? [user, friendObj.user as UserType] : [user];
    }
  }, [expenseTargetType, selectedGroupId, selectedFriendId, groups, friends, user]);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    const group = groups.find((g) => g.id === groupId);
    if (group && group.members) {
      const memberIds = group.members.map((m) => m.userId);
      setSelectedParticipants(memberIds);
      if (!memberIds.includes(paidById)) {
        setPaidById(user.id);
      }
    }
  };

  const handleFriendChange = (friendId: string) => {
    setSelectedFriendId(friendId);
    setSelectedParticipants([user.id, friendId]);
    if (paidById !== user.id && paidById !== friendId) {
      setPaidById(user.id);
    }
  };

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      if (selectedParticipants.length <= 1) {
        setFormError("Expense must have at least one participant");
        return;
      }
      setSelectedParticipants(selectedParticipants.filter((id) => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  // Live parsed paise
  const totalPaise = parseRupeesToPaise(amountStr);

  // Computed equal split shares
  const equalSplits = useMemo(() => {
    if (totalPaise <= 0 || selectedParticipants.length === 0) return [];
    return calculateEqualSplit(totalPaise, selectedParticipants);
  }, [totalPaise, selectedParticipants]);

  // Custom split validation
  const customSplitValidation = useMemo(() => {
    if (splitType !== "CUSTOM") {
      return {
        isValid: true,
        differencePaise: 0,
        allocatedPaise: totalPaise,
        errorMessage: undefined,
      };
    }
    const customList = selectedParticipants.map((uid) => ({
      userId: uid,
      amountPaise: parseRupeesToPaise(customSplits[uid] || "0"),
    }));
    return validateCustomSplit(totalPaise, customList);
  }, [splitType, selectedParticipants, customSplits, totalPaise]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Please enter an expense title");
      return;
    }

    if (totalPaise <= 0) {
      setFormError("Please enter an amount greater than ₹0");
      return;
    }

    if (selectedParticipants.length === 0) {
      setFormError("Please select at least one participant");
      return;
    }

    // Prepare splits
    let finalSplits: { userId: string; amountPaise: number }[] = [];

    if (splitType === "EQUAL") {
      finalSplits = equalSplits;
    } else {
      if (!customSplitValidation.isValid) {
        setFormError(customSplitValidation.errorMessage || "Custom splits must equal total amount");
        return;
      }
      finalSplits = selectedParticipants.map((uid) => ({
        userId: uid,
        amountPaise: parseRupeesToPaise(customSplits[uid] || "0"),
      }));
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: title.trim(),
          amountPaise: totalPaise,
          date: expenseDate,
          payerId: paidById,
          groupId: expenseTargetType === "group" ? selectedGroupId : undefined,
          splitType,
          notes: description.trim() || undefined,
          splits: finalSplits,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create expense");
        setIsSubmitting(false);
        return;
      }

      // Navigate to destination
      if (expenseTargetType === "group" && selectedGroupId) {
        router.push(`/groups/${selectedGroupId}`);
      } else if (expenseTargetType === "individual" && selectedFriendId) {
        router.push(`/friends/${selectedFriendId}`);
      } else {
        router.push("/");
      }
    } catch {
      setFormError("Network error creating expense");
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#065F46]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopHeader
        title="Add Expense"
        subtitle="Split with friends"
        showBack
        backHref="/"
      />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2.5 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Title and Amount Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <Input
            label="Expense Description / Title"
            placeholder="e.g. Dinner at Social, Uber ride, Groceries"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase block">
              Total Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg font-sans">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#065F46] focus:border-transparent transition font-sans"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase block">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#065F46]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase block">
                Optional Notes
              </label>
              <input
                type="text"
                placeholder="Add note"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#065F46]"
              />
            </div>
          </div>
        </div>

        {/* Target Selector: Group vs Individual Friend */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setExpenseTargetType("group");
                if (groups.length > 0 && !selectedGroupId) {
                  handleGroupChange(groups[0].id);
                }
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition select-none ${
                expenseTargetType === "group"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              In a Group
            </button>
            <button
              type="button"
              onClick={() => {
                setExpenseTargetType("individual");
                if (friends.length > 0 && !selectedFriendId) {
                  handleFriendChange(friends[0].user.id);
                }
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition select-none ${
                expenseTargetType === "individual"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Direct with a Friend
            </button>
          </div>

          {expenseTargetType === "group" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Choose Group
              </label>
              {groups.length === 0 ? (
                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  No groups yet. Create a group first or choose &quot;Direct with a Friend&quot;.
                </p>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#065F46]"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.members.length} members)
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Choose Friend
              </label>
              {friends.length === 0 ? (
                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  No friends connected yet. Add a friend first!
                </p>
              ) : (
                <select
                  value={selectedFriendId}
                  onChange={(e) => handleFriendChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#065F46]"
                >
                  {friends.map((f) => (
                    <option key={f.user.id} value={f.user.id}>
                      {f.user.name} (@{f.user.username})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Paid By Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block">
              Paid By
            </label>
            <select
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#065F46]"
            >
              {availableParticipants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === user.id ? `You (${p.name})` : p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Method & Participants Selection Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Split Options
              </h3>
              <p className="text-[11px] text-slate-500">
                {splitType === "EQUAL" ? "Split equally among participants" : "Custom amounts per person"}
              </p>
            </div>

            <div className="flex p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSplitType("EQUAL")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition select-none ${
                  splitType === "EQUAL"
                    ? "bg-[#065F46] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Equal
              </button>
              <button
                type="button"
                onClick={() => {
                  setSplitType("CUSTOM");
                  // Initialize custom splits with equal shares
                  const initial: Record<string, string> = {};
                  equalSplits.forEach((s) => {
                    initial[s.userId] = paiseToInputString(s.amountPaise);
                  });
                  setCustomSplits(initial);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition select-none ${
                  splitType === "CUSTOM"
                    ? "bg-[#065F46] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Participant list with checkbox / custom inputs */}
          <div className="space-y-2">
            {availableParticipants.map((p) => {
              const isSelected = selectedParticipants.includes(p.id);
              const equalShare = equalSplits.find((s) => s.userId === p.id);

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-slate-50/80 border-slate-200"
                      : "bg-white border-slate-100 opacity-60"
                  }`}
                >
                  <div
                    onClick={() => toggleParticipant(p.id)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 select-none"
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                        isSelected
                          ? "bg-[#065F46] border-[#065F46] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {p.name} {p.id === user.id && "(You)"}
                      </p>
                      <p className="text-[10px] text-slate-500">@{p.username}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="shrink-0">
                      {splitType === "EQUAL" ? (
                        <span className="text-xs font-bold text-slate-900 font-sans">
                          {equalShare ? formatPaise(equalShare.amountPaise) : "₹0"}
                        </span>
                      ) : (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-sans">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={customSplits[p.id] || ""}
                            onChange={(e) =>
                              setCustomSplits({
                                ...customSplits,
                                [p.id]: e.target.value,
                              })
                            }
                            className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-[#065F46] font-sans"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {splitType === "CUSTOM" && !customSplitValidation.isValid && (
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-medium text-amber-800">
              {customSplitValidation.errorMessage}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || (splitType === "CUSTOM" && !customSplitValidation.isValid)}
            className="w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording Expense...</span>
              </>
            ) : (
              <span>Save & Split Expense</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#065F46]" />
        </div>
      }
    >
      <NewExpenseForm />
    </Suspense>
  );
}
