/**
 * Money & Expense Splitting Engine
 * Strictly integer paise based calculations to guarantee precision and eliminate rounding drift.
 */

export interface SplitResult {
  userId: string;
  amountPaise: number;
}

/**
 * Distributes total paise equally among participant IDs.
 * Guaranteed: Sum of amounts === totalAmountPaise.
 * Any remainder paise (e.g. 100 paise / 3 = 33 with 1 remainder) is allocated
 * 1 paise at a time to participants in sequence.
 */
export function calculateEqualSplit(
  totalAmountPaise: number,
  participantUserIds: string[]
): SplitResult[] {
  if (participantUserIds.length === 0 || totalAmountPaise <= 0) {
    return [];
  }

  const count = participantUserIds.length;
  const baseShare = Math.floor(totalAmountPaise / count);
  let remainder = totalAmountPaise % count;

  return participantUserIds.map((userId) => {
    let share = baseShare;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    return {
      userId,
      amountPaise: share,
    };
  });
}

/**
 * Validates custom split amounts against total expense amount.
 */
export function validateCustomSplit(
  totalAmountPaise: number,
  splits: { userId: string; amountPaise: number }[]
): {
  isValid: boolean;
  allocatedPaise: number;
  differencePaise: number;
  errorMessage?: string;
} {
  const allocatedPaise = splits.reduce((acc, s) => acc + s.amountPaise, 0);
  const differencePaise = totalAmountPaise - allocatedPaise;

  if (allocatedPaise !== totalAmountPaise) {
    return {
      isValid: false,
      allocatedPaise,
      differencePaise,
      errorMessage:
        differencePaise > 0
          ? `Remaining amount to allocate: ₹${(differencePaise / 100).toFixed(2)}`
          : `Allocated amount exceeds total by ₹${(Math.abs(differencePaise) / 100).toFixed(2)}`,
    };
  }

  return {
    isValid: true,
    allocatedPaise,
    differencePaise: 0,
  };
}

/**
 * Calculates net bilateral balances between the current user and other users
 * from expenses and settlements.
 */
export interface BilateralBalance {
  otherUserId: string;
  netPaise: number;    // Positive: other user owes you; Negative: you owe other user
  youOwePaise: number;
  theyOwePaise: number;
}

export function computeBilateralBalances(
  currentUserId: string,
  expenses: Array<{
    id: string;
    totalAmountPaise: number;
    paidById: string;
    deletedAt?: string | null;
    splits?: Array<{ userId: string; amountPaise: number }>;
  }>,
  settlements: Array<{
    id: string;
    fromUserId: string;
    toUserId: string;
    amountPaise: number;
  }>
): Map<string, BilateralBalance> {
  // Map of otherUserId -> net balance from current user's perspective
  // (+ means they owe current user, - means current user owes them)
  const balances = new Map<string, number>();

  const getBalance = (uid: string) => balances.get(uid) || 0;
  const setBalance = (uid: string, amt: number) => balances.set(uid, amt);

  // 1. Process Expenses
  for (const exp of expenses) {
    if (exp.deletedAt) continue;
    const paidBy = exp.paidById;
    const splits = exp.splits || [];

    if (paidBy === currentUserId) {
      // Current user paid: other participants owe their split to current user
      for (const split of splits) {
        if (split.userId !== currentUserId) {
          setBalance(split.userId, getBalance(split.userId) + split.amountPaise);
        }
      }
    } else {
      // Someone else paid: did current user participate?
      const currentUserSplit = splits.find((s) => s.userId === currentUserId);
      if (currentUserSplit) {
        // Current user owes the payer for their share
        setBalance(paidBy, getBalance(paidBy) - currentUserSplit.amountPaise);
      }
    }
  }

  // 2. Process Settlements
  for (const st of settlements) {
    if (st.fromUserId === currentUserId) {
      // Current user paid them: increases current user's credit / reduces what current user owed
      setBalance(st.toUserId, getBalance(st.toUserId) + st.amountPaise);
    } else if (st.toUserId === currentUserId) {
      // They paid current user: reduces what they owed
      setBalance(st.fromUserId, getBalance(st.fromUserId) - st.amountPaise);
    }
  }

  const result = new Map<string, BilateralBalance>();
  balances.forEach((netPaise, otherUserId) => {
    result.set(otherUserId, {
      otherUserId,
      netPaise,
      theyOwePaise: netPaise > 0 ? netPaise : 0,
      youOwePaise: netPaise < 0 ? Math.abs(netPaise) : 0,
    });
  });

  return result;
}

export interface UserBalanceItem {
  userId: string;
  name: string;
  image?: string | null;
  amountPaise: number;
}

export interface DetailedUserBalances {
  netBalancePaise: number;
  totalOwedToYouPaise: number;
  totalYouOwePaise: number;
  owedToYou: UserBalanceItem[];
  youOwe: UserBalanceItem[];
}

/**
 * Combines bilateral balances with user directory metadata to provide
 * individual user-wise breakdowns for dashboard and friend displays.
 * Automatically excludes fully settled (0 balance) entries and merges multiple expenses.
 */
export function getUserBalanceBreakdown(
  currentUserId: string,
  expenses: Array<{
    id: string;
    totalAmountPaise: number;
    paidById: string;
    deletedAt?: string | null;
    splits?: Array<{ userId: string; amountPaise: number }>;
  }>,
  settlements: Array<{
    id: string;
    fromUserId: string;
    toUserId: string;
    amountPaise: number;
  }>,
  users: Array<{ id: string; name: string; username: string; image?: string | null }>
): DetailedUserBalances {
  const bilateralMap = computeBilateralBalances(currentUserId, expenses, settlements);

  const owedToYou: UserBalanceItem[] = [];
  const youOwe: UserBalanceItem[] = [];

  let totalOwedToYouPaise = 0;
  let totalYouOwePaise = 0;

  bilateralMap.forEach((bal, otherUserId) => {
    // Exclude fully settled users (only show non-zero outstanding balances)
    if (bal.netPaise === 0) return;

    const userObj = users.find((u) => u.id === otherUserId);
    const name = userObj ? userObj.name : `User ${otherUserId.slice(0, 6)}`;
    const image = userObj?.image;

    if (bal.netPaise > 0) {
      totalOwedToYouPaise += bal.theyOwePaise;
      owedToYou.push({
        userId: otherUserId,
        name,
        image,
        amountPaise: bal.theyOwePaise,
      });
    } else if (bal.netPaise < 0) {
      totalYouOwePaise += bal.youOwePaise;
      youOwe.push({
        userId: otherUserId,
        name,
        image,
        amountPaise: bal.youOwePaise,
      });
    }
  });

  // Sort descending by amount (largest on top)
  owedToYou.sort((a, b) => b.amountPaise - a.amountPaise);
  youOwe.sort((a, b) => b.amountPaise - a.amountPaise);

  return {
    netBalancePaise: totalOwedToYouPaise - totalYouOwePaise,
    totalOwedToYouPaise,
    totalYouOwePaise,
    owedToYou,
    youOwe,
  };
}

/**
 * Minimal Debt Simplification Algorithm for Groups
 * Resolves multidirectional debts to the minimum number of transactions.
 */
export function simplifyGroupDebts(
  memberBalances: Array<{ userId: string; netPaise: number }>
): Array<{ fromUserId: string; toUserId: string; amountPaise: number }> {
  const debtors: Array<{ userId: string; amount: number }> = [];
  const creditors: Array<{ userId: string; amount: number }> = [];

  for (const mb of memberBalances) {
    if (mb.netPaise < 0) {
      debtors.push({ userId: mb.userId, amount: Math.abs(mb.netPaise) });
    } else if (mb.netPaise > 0) {
      creditors.push({ userId: mb.userId, amount: mb.netPaise });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: Array<{ fromUserId: string; toUserId: string; amountPaise: number }> = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0) {
      transactions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountPaise: settleAmount,
      });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
    }

    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }

  return transactions;
}
