import {
  User,
  Friendship,
  Group,
  Expense,
  Settlement,
  ActivityLog,
} from "@/types";

export const CURRENT_USER: User = {
  id: "usr_jatin",
  email: "jatin.sharma@example.com",
  name: "Jatin Sharma",
  username: "jatin",
  image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  createdAt: "2026-01-10T10:00:00Z",
  updatedAt: "2026-01-10T10:00:00Z",
};

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  {
    id: "usr_rahul",
    email: "rahul.verma@example.com",
    name: "Rahul Verma",
    username: "rahul",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    createdAt: "2026-01-11T12:00:00Z",
    updatedAt: "2026-01-11T12:00:00Z",
  },
  {
    id: "usr_aman",
    email: "aman.gupta@example.com",
    name: "Aman Gupta",
    username: "aman",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    createdAt: "2026-01-12T09:30:00Z",
    updatedAt: "2026-01-12T09:30:00Z",
  },
  {
    id: "usr_priya",
    email: "priya.patel@example.com",
    name: "Priya Patel",
    username: "priya",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    createdAt: "2026-01-15T15:20:00Z",
    updatedAt: "2026-01-15T15:20:00Z",
  },
  {
    id: "usr_sneha",
    email: "sneha.rao@example.com",
    name: "Sneha Rao",
    username: "sneha",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    createdAt: "2026-01-18T18:45:00Z",
    updatedAt: "2026-01-18T18:45:00Z",
  },
  {
    id: "usr_vikram",
    email: "vikram.singh@example.com",
    name: "Vikram Singh",
    username: "vikram",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    createdAt: "2026-02-01T11:00:00Z",
    updatedAt: "2026-02-01T11:00:00Z",
  },
  {
    id: "usr_neha",
    email: "neha.kapoor@example.com",
    name: "Neha Kapoor",
    username: "neha",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    createdAt: "2026-02-10T14:15:00Z",
    updatedAt: "2026-02-10T14:15:00Z",
  },
];

export const MOCK_FRIENDSHIPS: Friendship[] = [
  {
    id: "fr_1",
    requesterId: "usr_jatin",
    recipientId: "usr_rahul",
    status: "ACCEPTED",
    createdAt: "2026-01-12T10:00:00Z",
    updatedAt: "2026-01-12T10:05:00Z",
    otherUser: MOCK_USERS[1],
  },
  {
    id: "fr_2",
    requesterId: "usr_aman",
    recipientId: "usr_jatin",
    status: "ACCEPTED",
    createdAt: "2026-01-13T11:00:00Z",
    updatedAt: "2026-01-13T11:30:00Z",
    otherUser: MOCK_USERS[2],
  },
  {
    id: "fr_3",
    requesterId: "usr_jatin",
    recipientId: "usr_priya",
    status: "ACCEPTED",
    createdAt: "2026-01-16T08:00:00Z",
    updatedAt: "2026-01-16T08:15:00Z",
    otherUser: MOCK_USERS[3],
  },
  {
    id: "fr_4",
    requesterId: "usr_sneha",
    recipientId: "usr_jatin",
    status: "ACCEPTED",
    createdAt: "2026-01-19T14:00:00Z",
    updatedAt: "2026-01-19T14:10:00Z",
    otherUser: MOCK_USERS[4],
  },
  // Pending incoming request from Vikram
  {
    id: "fr_5",
    requesterId: "usr_vikram",
    recipientId: "usr_jatin",
    status: "PENDING",
    createdAt: "2026-02-17T09:20:00Z",
    updatedAt: "2026-02-17T09:20:00Z",
    otherUser: MOCK_USERS[5],
  },
  // Pending outgoing request to Neha
  {
    id: "fr_6",
    requesterId: "usr_jatin",
    recipientId: "usr_neha",
    status: "PENDING",
    createdAt: "2026-02-16T16:45:00Z",
    updatedAt: "2026-02-16T16:45:00Z",
    otherUser: MOCK_USERS[6],
  },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: "grp_goa",
    name: "Goa Weekend Trip",
    description: "Beach shacks, scooter rentals, and seafood dinners",
    createdBy: "usr_jatin",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-15T18:00:00Z",
    members: [
      { id: "gm_1", groupId: "grp_goa", userId: "usr_jatin", joinedAt: "2026-02-01T10:00:00Z", user: MOCK_USERS[0] },
      { id: "gm_2", groupId: "grp_goa", userId: "usr_rahul", joinedAt: "2026-02-01T10:05:00Z", user: MOCK_USERS[1] },
      { id: "gm_3", groupId: "grp_goa", userId: "usr_aman", joinedAt: "2026-02-01T10:10:00Z", user: MOCK_USERS[2] },
      { id: "gm_4", groupId: "grp_goa", userId: "usr_priya", joinedAt: "2026-02-01T10:15:00Z", user: MOCK_USERS[3] },
    ],
  },
  {
    id: "grp_apt",
    name: "Apartment 402",
    description: "Monthly groceries, utilities, and domestic maintenance",
    createdBy: "usr_rahul",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-02-14T20:30:00Z",
    members: [
      { id: "gm_5", groupId: "grp_apt", userId: "usr_jatin", joinedAt: "2026-01-01T00:00:00Z", user: MOCK_USERS[0] },
      { id: "gm_6", groupId: "grp_apt", userId: "usr_rahul", joinedAt: "2026-01-01T00:00:00Z", user: MOCK_USERS[1] },
      { id: "gm_7", groupId: "grp_apt", userId: "usr_aman", joinedAt: "2026-01-01T00:00:00Z", user: MOCK_USERS[2] },
    ],
  },
  {
    id: "grp_lunch",
    name: "Team Lunches",
    description: "Weekday meals, coffees, and quick bites",
    createdBy: "usr_jatin",
    createdAt: "2026-01-20T12:00:00Z",
    updatedAt: "2026-02-12T14:00:00Z",
    members: [
      { id: "gm_8", groupId: "grp_lunch", userId: "usr_jatin", joinedAt: "2026-01-20T12:00:00Z", user: MOCK_USERS[0] },
      { id: "gm_9", groupId: "grp_lunch", userId: "usr_priya", joinedAt: "2026-01-20T12:00:00Z", user: MOCK_USERS[3] },
      { id: "gm_10", groupId: "grp_lunch", userId: "usr_sneha", joinedAt: "2026-01-20T12:00:00Z", user: MOCK_USERS[4] },
    ],
  },
];

export const MOCK_EXPENSES: Expense[] = [
  // Expense 1: Prompt canonical example: Jatin pays ₹900, split equally among Jatin, Rahul, Aman
  {
    id: "exp_1",
    title: "Dinner at Fisherman's Wharf",
    description: "Seafood curry, garlic naan, and drinks in Panaji",
    totalAmountPaise: 90000, // ₹900.00
    paidById: "usr_jatin",
    groupId: "grp_goa",
    createdById: "usr_jatin",
    expenseDate: "2026-02-15T21:00:00Z",
    createdAt: "2026-02-15T21:30:00Z",
    updatedAt: "2026-02-15T21:30:00Z",
    paidBy: MOCK_USERS[0],
    group: MOCK_GROUPS[0],
    splits: [
      { id: "spl_1", expenseId: "exp_1", userId: "usr_jatin", amountPaise: 30000, user: MOCK_USERS[0] },
      { id: "spl_2", expenseId: "exp_1", userId: "usr_rahul", amountPaise: 30000, user: MOCK_USERS[1] },
      { id: "spl_3", expenseId: "exp_1", userId: "usr_aman", amountPaise: 30000, user: MOCK_USERS[2] },
    ],
  },
  // Expense 2: Rahul pays ₹1,500 in Apartment 402, split equally among Jatin, Rahul, Aman
  {
    id: "exp_2",
    title: "Weekly Grocery Restock",
    description: "Milk, bread, fruits, and snacks from Nature's Basket",
    totalAmountPaise: 150000, // ₹1,500.00
    paidById: "usr_rahul",
    groupId: "grp_apt",
    createdById: "usr_rahul",
    expenseDate: "2026-02-14T18:00:00Z",
    createdAt: "2026-02-14T18:30:00Z",
    updatedAt: "2026-02-14T18:30:00Z",
    paidBy: MOCK_USERS[1],
    group: MOCK_GROUPS[1],
    splits: [
      { id: "spl_4", expenseId: "exp_2", userId: "usr_jatin", amountPaise: 50000, user: MOCK_USERS[0] },
      { id: "spl_5", expenseId: "exp_2", userId: "usr_rahul", amountPaise: 50000, user: MOCK_USERS[1] },
      { id: "spl_6", expenseId: "exp_2", userId: "usr_aman", amountPaise: 50000, user: MOCK_USERS[2] },
    ],
  },
  // Expense 3: Custom split example: Jatin pays ₹2,450.50 in Team Lunches
  {
    id: "exp_3",
    title: "Team Lunch at Social",
    description: "Burgers, artisanal fries, and cold beverages",
    totalAmountPaise: 245050, // ₹2,450.50
    paidById: "usr_jatin",
    groupId: "grp_lunch",
    createdById: "usr_jatin",
    expenseDate: "2026-02-13T13:30:00Z",
    createdAt: "2026-02-13T14:00:00Z",
    updatedAt: "2026-02-13T14:00:00Z",
    paidBy: MOCK_USERS[0],
    group: MOCK_GROUPS[2],
    splits: [
      { id: "spl_7", expenseId: "exp_3", userId: "usr_jatin", amountPaise: 60050, user: MOCK_USERS[0] }, // ₹600.50
      { id: "spl_8", expenseId: "exp_3", userId: "usr_priya", amountPaise: 95000, user: MOCK_USERS[3] }, // ₹950.00
      { id: "spl_9", expenseId: "exp_3", userId: "usr_sneha", amountPaise: 90000, user: MOCK_USERS[4] }, // ₹900.00
    ],
  },
  // Expense 4: Direct friend expense without a group: Jatin and Priya
  {
    id: "exp_4",
    title: "Cab to Airport",
    description: "Uber Premier to Terminal 2",
    totalAmountPaise: 42000, // ₹420.00
    paidById: "usr_jatin",
    groupId: null,
    createdById: "usr_jatin",
    expenseDate: "2026-02-12T07:15:00Z",
    createdAt: "2026-02-12T08:00:00Z",
    updatedAt: "2026-02-12T08:00:00Z",
    paidBy: MOCK_USERS[0],
    splits: [
      { id: "spl_10", expenseId: "exp_4", userId: "usr_jatin", amountPaise: 21000, user: MOCK_USERS[0] },
      { id: "spl_11", expenseId: "exp_4", userId: "usr_priya", amountPaise: 21000, user: MOCK_USERS[3] },
    ],
  },
  // Expense 5: Aman pays ₹1,200 for Beach Shack in Goa Trip
  {
    id: "exp_5",
    title: "Beach Shack Drinks & Snacks",
    description: "Fresh coconuts, juices, and nachos at Anjuna",
    totalAmountPaise: 120000, // ₹1,200.00
    paidById: "usr_aman",
    groupId: "grp_goa",
    createdById: "usr_aman",
    expenseDate: "2026-02-11T16:00:00Z",
    createdAt: "2026-02-11T16:30:00Z",
    updatedAt: "2026-02-11T16:30:00Z",
    paidBy: MOCK_USERS[2],
    group: MOCK_GROUPS[0],
    splits: [
      { id: "spl_12", expenseId: "exp_5", userId: "usr_jatin", amountPaise: 30000, user: MOCK_USERS[0] },
      { id: "spl_13", expenseId: "exp_5", userId: "usr_rahul", amountPaise: 30000, user: MOCK_USERS[1] },
      { id: "spl_14", expenseId: "exp_5", userId: "usr_aman", amountPaise: 30000, user: MOCK_USERS[2] },
      { id: "spl_15", expenseId: "exp_5", userId: "usr_priya", amountPaise: 30000, user: MOCK_USERS[3] },
    ],
  },
];

export const MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: "set_1",
    fromUserId: "usr_rahul",
    toUserId: "usr_jatin",
    amountPaise: 30000, // ₹300.00
    groupId: "grp_goa",
    note: "Settled Fisherman's Wharf dinner share",
    createdById: "usr_rahul",
    createdAt: "2026-02-16T10:00:00Z",
    fromUser: MOCK_USERS[1],
    toUser: MOCK_USERS[0],
    group: MOCK_GROUPS[0],
  },
  {
    id: "set_2",
    fromUserId: "usr_sneha",
    toUserId: "usr_jatin",
    amountPaise: 50000, // ₹500.00
    groupId: "grp_lunch",
    note: "Partial settlement for Social lunch",
    createdById: "usr_sneha",
    createdAt: "2026-02-14T11:00:00Z",
    fromUser: MOCK_USERS[4],
    toUser: MOCK_USERS[0],
    group: MOCK_GROUPS[2],
  },
];

export const MOCK_ACTIVITIES: ActivityLog[] = [
  {
    id: "act_1",
    actorId: "usr_rahul",
    actionType: "SETTLEMENT_RECORDED",
    entityType: "SETTLEMENT",
    entityId: "set_1",
    groupId: "grp_goa",
    metadata: {
      amountPaise: 30000,
      toUserName: "Jatin Sharma",
      note: "Settled Fisherman's Wharf dinner share",
    },
    createdAt: "2026-02-16T10:00:00Z",
    actor: MOCK_USERS[1],
  },
  {
    id: "act_2",
    actorId: "usr_jatin",
    actionType: "EXPENSE_ADDED",
    entityType: "EXPENSE",
    entityId: "exp_1",
    groupId: "grp_goa",
    metadata: {
      title: "Dinner at Fisherman's Wharf",
      amountPaise: 90000,
      groupName: "Goa Weekend Trip",
    },
    createdAt: "2026-02-15T21:30:00Z",
    actor: MOCK_USERS[0],
  },
  {
    id: "act_3",
    actorId: "usr_rahul",
    actionType: "EXPENSE_ADDED",
    entityType: "EXPENSE",
    entityId: "exp_2",
    groupId: "grp_apt",
    metadata: {
      title: "Weekly Grocery Restock",
      amountPaise: 150000,
      groupName: "Apartment 402",
    },
    createdAt: "2026-02-14T18:30:00Z",
    actor: MOCK_USERS[1],
  },
  {
    id: "act_4",
    actorId: "usr_sneha",
    actionType: "SETTLEMENT_RECORDED",
    entityType: "SETTLEMENT",
    entityId: "set_2",
    groupId: "grp_lunch",
    metadata: {
      amountPaise: 50000,
      toUserName: "Jatin Sharma",
      note: "Partial settlement for Social lunch",
    },
    createdAt: "2026-02-14T11:00:00Z",
    actor: MOCK_USERS[4],
  },
  {
    id: "act_5",
    actorId: "usr_jatin",
    actionType: "EXPENSE_ADDED",
    entityType: "EXPENSE",
    entityId: "exp_3",
    groupId: "grp_lunch",
    metadata: {
      title: "Team Lunch at Social",
      amountPaise: 245050,
      groupName: "Team Lunches",
    },
    createdAt: "2026-02-13T14:00:00Z",
    actor: MOCK_USERS[0],
  },
  {
    id: "act_6",
    actorId: "usr_priya",
    actionType: "FRIEND_REQUEST_ACCEPTED",
    entityType: "FRIENDSHIP",
    entityId: "fr_3",
    metadata: {
      userName: "Priya Patel",
    },
    createdAt: "2026-01-16T08:15:00Z",
    actor: MOCK_USERS[3],
  },
  {
    id: "act_7",
    actorId: "usr_jatin",
    actionType: "GROUP_CREATED",
    entityType: "GROUP",
    entityId: "grp_goa",
    metadata: {
      groupName: "Goa Weekend Trip",
      membersCount: 4,
    },
    createdAt: "2026-02-01T10:00:00Z",
    actor: MOCK_USERS[0],
  },
];
