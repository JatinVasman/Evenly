import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 50);

    // Fetch related group, friendship, expense, and settlement IDs for data isolation
    const [userGroups, userFriendships, userSplits, userPaidExpenses, userSettlements] =
      await Promise.all([
        db.groupMember.findMany({
          where: { userId: currentUser.id },
          select: { groupId: true },
        }),
        db.friendship.findMany({
          where: {
            OR: [{ requesterId: currentUser.id }, { recipientId: currentUser.id }],
          },
          select: { id: true },
        }),
        db.expenseSplit.findMany({
          where: { userId: currentUser.id },
          select: { expenseId: true },
        }),
        db.expense.findMany({
          where: { payerId: currentUser.id },
          select: { id: true },
        }),
        db.settlement.findMany({
          where: {
            OR: [{ payerId: currentUser.id }, { payeeId: currentUser.id }],
          },
          select: { id: true },
        }),
      ]);

    const relatedEntityIds = [
      ...userGroups.map((g) => g.groupId),
      ...userFriendships.map((f) => f.id),
      ...userSplits.map((s) => s.expenseId),
      ...userPaidExpenses.map((e) => e.id),
      ...userSettlements.map((s) => s.id),
    ];

    // Strictly scope activities to current user's actions and related entities
    const activities = await db.activityLog.findMany({
      where: {
        OR: [
          { actorId: currentUser.id },
          { entityId: { in: relatedEntityIds } },
        ],
      },
      include: {
        actor: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const parsed = activities.map((act) => ({
      id: act.id,
      actorId: act.actorId,
      actor: act.actor,
      actionType: act.actionType,
      entityType: act.entityType,
      entityId: act.entityId,
      metadata: act.metadata ? JSON.parse(act.metadata) : null,
      createdAt: act.createdAt.toISOString(),
    }));

    return NextResponse.json({ activities: parsed });
  } catch (error) {
    console.error("Fetch activity error:", error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
