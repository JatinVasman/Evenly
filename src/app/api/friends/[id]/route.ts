import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { computeBilateralBalances } from "@/lib/money";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: friendId } = await context.params;

    // Fetch friend details, friendship relation, shared expenses, and settlements in parallel
    const [friend, friendship, sharedExpenses, sharedSettlements] = await Promise.all([
      db.user.findUnique({
        where: { id: friendId },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          createdAt: true,
        },
      }),
      db.friendship.findFirst({
        where: {
          OR: [
            { requesterId: currentUser.id, recipientId: friendId },
            { requesterId: friendId, recipientId: currentUser.id },
          ],
        },
      }),
      db.expense.findMany({
        where: {
          deletedAt: null,
          AND: [
            {
              OR: [
                { payerId: currentUser.id },
                { splits: { some: { userId: currentUser.id } } },
              ],
            },
            {
              OR: [
                { payerId: friendId },
                { splits: { some: { userId: friendId } } },
              ],
            },
          ],
        },
        include: {
          payer: { select: { id: true, name: true, username: true } },
          splits: {
            include: {
              user: { select: { id: true, name: true, username: true } },
            },
          },
          group: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
      }),
      db.settlement.findMany({
        where: {
          OR: [
            { payerId: currentUser.id, payeeId: friendId },
            { payerId: friendId, payeeId: currentUser.id },
          ],
        },
        include: {
          payer: { select: { id: true, name: true, username: true } },
          payee: { select: { id: true, name: true, username: true } },
        },
        orderBy: { date: "desc" },
      }),
    ]);

    if (!friend) {
      return NextResponse.json({ error: "Friend not found" }, { status: 404 });
    }

    // Compute live net balance between currentUser and friend
    const mappedExpenses = sharedExpenses.map((e) => ({
      id: e.id,
      totalAmountPaise: e.amountPaise,
      paidById: e.payerId,
      deletedAt: e.deletedAt ? e.deletedAt.toISOString() : null,
      splits: e.splits.map((s) => ({ userId: s.userId, amountPaise: s.amountPaise })),
    }));

    const mappedSettlements = sharedSettlements.map((s) => ({
      id: s.id,
      fromUserId: s.payerId,
      toUserId: s.payeeId,
      amountPaise: s.amountPaise,
    }));

    const bilateralMap = computeBilateralBalances(
      currentUser.id,
      mappedExpenses,
      mappedSettlements
    );

    const balance = bilateralMap.get(friendId) || {
      otherUserId: friendId,
      netPaise: 0,
      theyOwePaise: 0,
      youOwePaise: 0,
    };

    return NextResponse.json({
      friend,
      friendshipStatus: friendship?.status || "NONE",
      friendshipId: friendship?.id,
      balance,
      sharedExpenses,
      sharedSettlements,
    });
  } catch (error) {
    console.error("Fetch friend details error:", error);
    return NextResponse.json({ error: "Failed to fetch friend details" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: friendId } = await context.params;

    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, recipientId: friendId },
          { requesterId: friendId, recipientId: currentUser.id },
        ],
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    await db.friendship.delete({
      where: { id: friendship.id },
    });

    return NextResponse.json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Delete friend error:", error);
    return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 });
  }
}
