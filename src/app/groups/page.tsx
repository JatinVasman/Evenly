"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/context/UserContext";
import { TopHeader } from "@/components/navigation/TopHeader";
import { GroupCard } from "@/components/groups/GroupCard";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { Plus, FolderKanban, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Group } from "@/types";

interface GroupListItem {
  id: string;
  name: string;
  description?: string | null;
  createdById: string;
  role: string;
  membersCount: number;
  expensesCount: number;
  totalExpensesPaise: number;
  userNetPaise: number;
  updatedAt: string;
  members: Array<{
    userId: string;
    role: string;
    name: string;
    username: string;
    image?: string | null;
  }>;
}

export default function GroupsListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useCurrentUser();
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadGroups();
    }
  }, [isAuthenticated, loadGroups]);

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
        title="Groups"
        subtitle={`${groups.length} active`}
        rightAction={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-emerald-50 text-[#065F46] flex items-center justify-center border border-emerald-200/80 transition active:scale-95 hover:bg-emerald-100"
            aria-label="Create group"
            title="Create Group"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#065F46]" />
            <p className="text-xs text-slate-500 mt-2">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No groups yet"
            description="Create a group to split trips, house bills, and events with friends"
            actionLabel="Create Group"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group as unknown as Group}
                netPaise={group.userNetPaise}
              />
            ))}
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadGroups}
      />
    </div>
  );
}
