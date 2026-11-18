"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Check, Loader2 } from "lucide-react";
import { invalidateCache } from "@/lib/useSWRQuery";

export interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newGroup: { id: string; name: string }) => void;
}

interface FriendOption {
  id: string;
  name: string;
  username: string;
  image?: string | null;
}

export function CreateGroupModal({ isOpen, onClose, onSuccess }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadFriends() {
      setIsLoadingFriends(true);
      try {
        const res = await fetch("/api/friends");
        const data = await res.json();
        if (data.friends) {
          const list: FriendOption[] = data.friends.map((f: { user: FriendOption }) => f.user);
          setFriends(list);
        }
      } catch {
        setFriends([]);
      } finally {
        setIsLoadingFriends(false);
      }
    }

    loadFriends();
  }, [isOpen]);

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a group name");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          memberUserIds: selectedMemberIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create group");
        setIsSubmitting(false);
        return;
      }

      setName("");
      setDescription("");
      setSelectedMemberIds([]);
      invalidateCache("/api/groups");
      invalidateCache("/api/dashboard");
      onClose();

      if (onSuccess) {
        onSuccess(data.group);
      }
    } catch {
      setError("Network error creating group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Group"
      description="Organize shared expenses with friends or roommates"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Group Name"
          placeholder=""
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          autoFocus
          required
        />

        <Input
          label="Description (Optional)"
          placeholder=""
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase block mb-2">
            Select Friends ({selectedMemberIds.length} selected)
          </label>

          {isLoadingFriends ? (
            <div className="py-6 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#065F46]" />
            </div>
          ) : friends.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
              No friends found. Add friends first, or create the group and invite them later!
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {friends.map((friend) => {
                const isSelected = selectedMemberIds.includes(friend.id);

                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleMember(friend.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none ${
                      isSelected
                        ? "bg-emerald-50 border border-emerald-200"
                        : "hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            friend.image ||
                            `https://avatar.vercel.sh/${friend.username}.svg`
                          }
                          alt={friend.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {friend.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          @{friend.username}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                        isSelected
                          ? "bg-[#065F46] border-[#065F46] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Group</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
