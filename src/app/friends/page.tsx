"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TopHeader } from "@/components/navigation/TopHeader";
import { FriendCard } from "@/components/friends/FriendCard";
import { AddFriendModal } from "@/components/friends/AddFriendModal";
import { InviteFriendModal } from "@/components/friends/InviteFriendModal";
import { UserPlus, Share2, Search, Check, X, Loader2, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { User } from "@/types";

interface FriendItem {
  friendshipId: string;
  user: User;
  status: string;
  netBalancePaise: number;
}

export default function FriendsListPage() {
  const [filter, setFilter] = useState<"all" | "owed" | "owe">("all");
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<FriendItem[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<FriendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setPendingIncoming(data.pendingIncoming || []);
        setPendingOutgoing(data.pendingOutgoing || []);
      }
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleAcceptRequest = async (friendshipId: string) => {
    setActionInProgressId(friendshipId);
    try {
      await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      await loadFriends();
    } catch (err) {
      console.error("Failed to accept friend request:", err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    setActionInProgressId(friendshipId);
    try {
      await fetch("/api/friends/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      await loadFriends();
    } catch (err) {
      console.error("Failed to reject friend request:", err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCancelRequest = async (friendshipId: string) => {
    setActionInProgressId(friendshipId);
    try {
      await fetch("/api/friends/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      await loadFriends();
    } catch (err) {
      console.error("Failed to cancel friend request:", err);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Filter friends
  const filteredFriends = friends.filter((f) => {
    const friend = f.user;
    const net = f.netBalancePaise;

    const matchesSearch =
      friend.name.toLowerCase().includes(search.toLowerCase()) ||
      friend.username.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "owed") return net > 0;
    if (filter === "owe") return net < 0;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopHeader
        title="Friends"
        subtitle={`${friends.length} connected`}
        rightAction={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
              aria-label="Invite link"
              title="Share Invite Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-emerald-50 text-[#065F46] flex items-center justify-center border border-emerald-200/80 transition active:scale-95 hover:bg-emerald-100"
              aria-label="Add friend"
              title="Add Friend"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search friends by name or @username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#065F46] focus:border-transparent transition shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {(
            [
              { id: "all", label: "All Friends" },
              { id: "owed", label: "Owes You" },
              { id: "owe", label: "You Owe" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition select-none ${
                filter === t.id
                  ? "bg-[#065F46] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Pending Incoming Requests Section */}
        {pendingIncoming.length > 0 && (
          <div className="space-y-2 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/70">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide block">
              Pending Friend Requests ({pendingIncoming.length})
            </span>
            <div className="space-y-2">
              {pendingIncoming.map((req) => (
                <div
                  key={req.friendshipId}
                  className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-amber-200 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          req.user.image ||
                          `https://avatar.vercel.sh/${req.user.username}.svg`
                        }
                        alt={req.user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {req.user.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        @{req.user.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAcceptRequest(req.friendshipId)}
                      disabled={actionInProgressId === req.friendshipId}
                      className="w-8 h-8 rounded-lg bg-[#065F46] text-white flex items-center justify-center hover:bg-[#047857] transition disabled:opacity-50"
                      aria-label="Accept request"
                    >
                      {actionInProgressId === req.friendshipId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.friendshipId)}
                      disabled={actionInProgressId === req.friendshipId}
                      className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition disabled:opacity-50"
                      aria-label="Reject request"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Outgoing Requests Section */}
        {pendingOutgoing.length > 0 && (
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Outgoing Requests ({pendingOutgoing.length})
            </span>
            <div className="space-y-1.5">
              {pendingOutgoing.map((req) => (
                <div
                  key={req.friendshipId}
                  className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-xs"
                >
                  <span className="text-slate-700 font-medium truncate">
                    {req.user.name} (@{req.user.username})
                  </span>
                  <button
                    onClick={() => handleCancelRequest(req.friendshipId)}
                    disabled={actionInProgressId === req.friendshipId}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#065F46]" />
            <p className="text-xs text-slate-500 mt-2">Loading friends...</p>
          </div>
        ) : filteredFriends.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "No friends match your search" : "No friends yet"}
            description={
              search
                ? "Try searching with a different name or username."
                : "Add friends by username or share your invite link to start splitting expenses."
            }
            actionLabel="Add a Friend"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="space-y-2.5">
            {filteredFriends.map((f) => (
              <FriendCard
                key={f.user.id}
                user={f.user}
                netPaise={f.netBalancePaise}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      <AddFriendModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onRequestSent={loadFriends}
      />

      {/* Invite Friend Modal */}
      <InviteFriendModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
