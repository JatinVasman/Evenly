/**
 * Core Data Models & Application Types
 * Normalized relational structures matching the database schema and financial domain.
 */

export type FriendshipStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";

export type SplitType = "EQUAL" | "CUSTOM";

export type ActionType =
  | "FRIEND_REQUEST_SENT"
  | "FRIEND_REQUEST_ACCEPTED"
  | "FRIEND_REQUEST_REJECTED"
  | "GROUP_CREATED"
  | "GROUP_MEMBER_ADDED"
  | "GROUP_MEMBER_REMOVED"
  | "EXPENSE_ADDED"
  | "EXPENSE_EDITED"
  | "EXPENSE_DELETED"
  | "SETTLEMENT_RECORDED";

export type EntityType = "USER" | "FRIENDSHIP" | "GROUP" | "EXPENSE" | "SETTLEMENT";

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Friendship {
  id: string;
  requesterId: string;
  recipientId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
  // Joined relations for UI
  otherUser?: User;
}

export interface Invitation {
  id: string;
  tokenHash: string;
  inviterId: string;
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
  leftAt?: string | null;
  user?: User;
}

export interface Expense {
  id: string;
  title: string;
  description?: string | null;
  totalAmountPaise: number; // Integer paise (e.g. ₹150.50 = 15050 paise)
  paidById: string;
  groupId?: string | null;
  createdById: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  splits?: ExpenseSplit[];
  paidBy?: User;
  group?: Group | null;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amountPaise: number;
  user?: User;
}

export interface Settlement {
  id: string;
  fromUserId: string; // Payer of settlement
  toUserId: string;   // Receiver of settlement
  amountPaise: number;
  groupId?: string | null;
  note?: string | null;
  createdById: string;
  createdAt: string;
  fromUser?: User;
  toUser?: User;
  group?: Group | null;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actionType: ActionType;
  entityType: EntityType;
  entityId: string;
  groupId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: User;
}

/**
 * Domain balance representations
 */
export interface UserBalance {
  userId: string;
  user: User;
  netPaise: number;     // Positive: user is owed money; Negative: user owes money
  youOwePaise: number;   // Amount current user owes them
  theyOwePaise: number;  // Amount they owe current user
}

export interface GroupDebtSummary {
  fromUser: User;
  toUser: User;
  amountPaise: number;
}
