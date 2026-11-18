"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Search, UserPlus, Check, AlertCircle, Loader2 } from "lucide-react";
import { invalidateCache } from "@/lib/useSWRQuery";

export interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSent?: () => void;
}

interface SearchedUser {
  id: string;
  name: string;
  username: string;
  image?: string | null;
  friendshipStatus: "NONE" | "ACCEPTED" | "PENDING_INCOMING" | "PENDING_OUTGOING";
  friendshipId?: string;
}

export function AddFriendModal({ isOpen, onClose, onRequestSent }: AddFriendModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const cleanQuery = query.trim().toLowerCase().replace(/^@/, "");
    if (!cleanQuery || cleanQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(cleanQuery)}`);
        const data = await res.json();
        setResults(data.users || []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSendRequest = async (user: SearchedUser) => {
    setSendingId(user.id);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: user.username }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedbackMsg({ type: "error", text: data.error || "Failed to send request" });
        return;
      }

      setFeedbackMsg({ type: "success", text: data.message || `Request sent to ${user.name}!` });
      invalidateCache("/api/friends");
      invalidateCache("/api/dashboard");
      // Update local status
      setResults((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, friendshipStatus: data.status === "ACCEPTED" ? "ACCEPTED" : "PENDING_OUTGOING" }
            : u
        )
      );

      if (onRequestSent) {
        onRequestSent();
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Network error sending friend request" });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Friend"
      description="Find friends by username or email address"
    >
      <div className="space-y-4">
        <Input
          placeholder=""
          leftAddon={<Search className="w-4 h-4" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in ${
              feedbackMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <div className="space-y-2.5 max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="text-center py-6 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#065F46]" />
            </div>
          ) : query.trim().length >= 2 && results.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-400" />
              No user found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((u) => {
              const isSending = sendingId === u.id;
              const isFriend = u.friendshipStatus === "ACCEPTED";
              const isPending =
                u.friendshipStatus === "PENDING_OUTGOING" ||
                u.friendshipStatus === "PENDING_INCOMING";

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-[#22302A] bg-slate-50/60 dark:bg-[#1A2420]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-[#22302A] shrink-0 bg-slate-200 dark:bg-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.image || `https://avatar.vercel.sh/${u.username}.svg`}
                        alt={u.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {u.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isFriend ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                        Friends
                      </span>
                    ) : isPending ? (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-1 rounded-lg">
                        {u.friendshipStatus === "PENDING_OUTGOING" ? "Request Sent" : "Pending"}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={isSending}
                        onClick={() => handleSendRequest(u)}
                        className="text-xs px-2.5 py-1 h-8"
                      >
                        {isSending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
