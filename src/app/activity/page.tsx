"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopHeader } from "@/components/navigation/TopHeader";
import { formatPaise } from "@/lib/utils";
import {
  Receipt,
  CreditCard,
  UserPlus,
  Users,
  CheckCircle2,
  Trash2,
  Edit3,
  Clock,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentUser } from "@/context/UserContext";

interface ActivityItem {
  id: string;
  actorId: string;
  actor: {
    id: string;
    name: string;
    username: string;
    image?: string | null;
  };
  actionType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export default function ActivityTrackerPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useCurrentUser();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "EXPENSE" | "SETTLEMENT" | "GROUP">("ALL");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadActivities();
    }
  }, [isAuthenticated, loadActivities]);

  const filteredActivities = activities.filter((act) => {
    if (filter === "EXPENSE") return act.actionType.startsWith("EXPENSE_");
    if (filter === "SETTLEMENT") return act.actionType === "SETTLEMENT_RECORDED";
    if (filter === "GROUP") return act.actionType.startsWith("GROUP_");
    return true;
  });

  const getActionDetails = (act: ActivityItem) => {
    const isActorCurrentUser = act.actorId === user.id;
    const actorName = isActorCurrentUser ? "You" : act.actor?.name || "User";

    switch (act.actionType) {
      case "EXPENSE_ADDED":
        return {
          icon: Receipt,
          iconBg: "bg-emerald-50 text-[#065F46] border-emerald-100",
          title: `${actorName} added "${act.metadata?.title || "an expense"}"`,
          description: act.metadata?.groupName
            ? `in ${act.metadata.groupName}`
            : "Direct expense",
          badge: act.metadata?.amountPaise
            ? formatPaise(act.metadata.amountPaise as number)
            : undefined,
        };
      case "EXPENSE_EDITED":
        return {
          icon: Edit3,
          iconBg: "bg-blue-50 text-blue-700 border-blue-100",
          title: `${actorName} updated an expense`,
          description: (act.metadata?.title as string) || "",
        };
      case "EXPENSE_DELETED":
        return {
          icon: Trash2,
          iconBg: "bg-red-50 text-red-700 border-red-100",
          title: `${actorName} deleted an expense`,
          description: (act.metadata?.title as string) || "",
        };
      case "SETTLEMENT_RECORDED":
        return {
          icon: CreditCard,
          iconBg: "bg-emerald-100 text-[#064E3B] border-emerald-200",
          title: isActorCurrentUser
            ? `You paid ${act.metadata?.toUserName || "a friend"}`
            : `${actorName} recorded a payment`,
          description: (act.metadata?.note as string) || "Settlement recorded",
          badge: act.metadata?.amountPaise
            ? formatPaise(act.metadata.amountPaise as number)
            : undefined,
        };
      case "GROUP_CREATED":
        return {
          icon: Users,
          iconBg: "bg-emerald-50 text-[#065F46] border-emerald-100",
          title: `${actorName} created group "${act.metadata?.groupName || "New Group"}"`,
          description: `${act.metadata?.membersCount || 0} members invited`,
        };
      case "FRIEND_REQUEST_ACCEPTED":
        return {
          icon: CheckCircle2,
          iconBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
          title: `${actorName} accepted a friend request`,
          description: "Connected as friends",
        };
      case "FRIEND_REQUEST_SENT":
        return {
          icon: UserPlus,
          iconBg: "bg-slate-100 text-slate-700 border-slate-200",
          title: `${actorName} sent a friend request`,
          description: "Pending acceptance",
        };
      default:
        return {
          icon: Clock,
          iconBg: "bg-slate-100 text-slate-700 border-slate-200",
          title: `${actorName} performed an action`,
          description: act.actionType,
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
      <TopHeader
        title="Activity"
        subtitle="Recent expense & account ledger"
      />

      <div className="p-4 space-y-4">
        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(
            [
              { id: "ALL", label: "All Activity" },
              { id: "EXPENSE", label: "Expenses" },
              { id: "SETTLEMENT", label: "Settlements" },
              { id: "GROUP", label: "Groups" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition select-none ${
                filter === item.id
                  ? "bg-[#065F46] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Activity Feed */}
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#065F46]" />
            <p className="text-xs text-slate-500 mt-2">Loading activity ledger...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No activity recorded"
            description="When you or your friends add expenses, create groups, or record settlements, they will be tracked here"
          />
        ) : (
          <div className="space-y-2.5">
            {filteredActivities.map((act) => {
              const details = getActionDetails(act);
              const Icon = details.icon;
              const formattedDate = new Date(act.createdAt).toLocaleDateString(
                "en-IN",
                {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );

              return (
                <div
                  key={act.id}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
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
                        {details.description} • {formattedDate}
                      </p>
                    </div>
                  </div>

                  {details.badge && (
                    <span className="text-xs font-extrabold text-slate-900 shrink-0 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-lg font-sans">
                      {details.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
