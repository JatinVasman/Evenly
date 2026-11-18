import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { computeBilateralBalances } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch all friendships involving the current user
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: currentUser.id },
          { recipientId: currentUser.id },
        ],
      },
      include: {
        requester: {
          select: { id: true, name: true, username: true, image: true },
        },
        recipient: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 2. Fetch all expenses and settlements involving current user to calculate live bilateral balances
    const expenses = await db.expense.findMany({
      where: {
        deletedAt: null,
        OR: [
          { payerId: currentUser.id },
          { splits: { some: { userId: currentUser.id } } },
        ],
      },
      include: {
        splits: true,
      },
    });

    const settlements = await db.settlement.findMany({
      where: {
        OR: [
          { payerId: currentUser.id },
          { payeeId: currentUser.id },
        ],
      },
    });

    const mappedExpenses = expenses.map((e) => ({
      id: e.id,
      totalAmountPaise: e.amountPaise,
      paidById: e.payerId,
      deletedAt: e.deletedAt ? e.deletedAt.toISOString() : null,
      splits: e.splits.map((s) => ({ userId: s.userId, amountPaise: s.amountPaise })),
    }));

    const mappedSettlements = settlements.map((s) => ({
      id: s.id,
      fromUserId: s.payerId,
      toUserId: s.payeeId,
      amountPaise: s.amountPaise,
    }));

    const bilateralBalances = computeBilateralBalances(
      currentUser.id,
      mappedExpenses,
      mappedSettlements
    );

    // 3. Separate into Accepted Friends, Pending Incoming, and Pending Outgoing
    const friends = [];
    const pendingIncoming = [];
    const pendingOutgoing = [];

    for (const f of friendships) {
      const isRequester = f.requesterId === currentUser.id;
      const otherUser = isRequester ? f.recipient : f.requester;
      const balance = bilateralBalances.get(otherUser.id);

      const friendPayload = {
        friendshipId: f.id,
        user: otherUser,
        status: f.status,
        createdAt: f.createdAt,
        netBalancePaise: balance ? balance.netPaise : 0,
      };

      if (f.status === "ACCEPTED") {
        friends.push(friendPayload);
      } else if (f.status === "PENDING") {
        if (isRequester) {
          pendingOutgoing.push(friendPayload);
        } else {
          pendingIncoming.push(friendPayload);
        }
      }
    }

    return NextResponse.json({
      friends,
      pendingIncoming,
      pendingOutgoing,
    });
  } catch (error) {
    console.error("Fetch friends error:", error);
    return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 });
  }
}
