import { db } from "@/lib/db";

export type ActivityActionType =
  | "EXPENSE_ADDED"
  | "EXPENSE_EDITED"
  | "EXPENSE_DELETED"
  | "SETTLEMENT_RECORDED"
  | "GROUP_CREATED"
  | "GROUP_MEMBER_ADDED"
  | "GROUP_MEMBER_REMOVED"
  | "FRIEND_REQUEST_SENT"
  | "FRIEND_REQUEST_ACCEPTED";

export type ActivityEntityType =
  | "EXPENSE"
  | "SETTLEMENT"
  | "GROUP"
  | "FRIENDSHIP"
  | "USER";

export interface ActivityMetadata {
  title?: string;
  groupName?: string;
  groupId?: string;
  amountPaise?: number;
  toUserName?: string;
  fromUserName?: string;
  membersCount?: number;
  note?: string;
  [key: string]: unknown;
}

/**
 * Creates an immutable activity record in the database.
 */
export async function recordActivity(
  actorId: string,
  actionType: ActivityActionType,
  entityType: ActivityEntityType,
  entityId: string,
  metadata?: ActivityMetadata
) {
  try {
    return await db.activityLog.create({
      data: {
        actorId,
        actionType,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error("Failed to record activity log:", error);
    return null;
  }
}
