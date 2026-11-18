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

    const { id: groupId } = await context.params;

    // Verify user is a member of this group
    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: currentUser.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this group" },
        { status: 403 }
      );
    }

    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, image: true } },
          },
        },
        expenses: {
          where: { deletedAt: null },
          include: {
            payer: { select: { id: true, name: true, username: true, image: true } },
            splits: {
              include: {
                user: { select: { id: true, name: true, username: true } },
              },
            },
          },
          orderBy: { date: "desc" },
        },
        settlements: {
          include: {
            payer: { select: { id: true, name: true, username: true } },
            payee: { select: { id: true, name: true, username: true } },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Map expenses and settlements for calculating bilateral balances
    const mappedExpenses = group.expenses.map((e) => ({
      id: e.id,
      totalAmountPaise: e.amountPaise,
      paidById: e.payerId,
      deletedAt: null,
      splits: e.splits.map((s) => ({ userId: s.userId, amountPaise: s.amountPaise })),
    }));

    const mappedSettlements = group.settlements.map((s) => ({
      id: s.id,
      fromUserId: s.payerId,
      toUserId: s.payeeId,
      amountPaise: s.amountPaise,
    }));

    // Calculate current user's balance in this group
    const userBilateral = computeBilateralBalances(
      currentUser.id,
      mappedExpenses,
      mappedSettlements
    );

    let userNetPaise = 0;
    userBilateral.forEach((b) => {
      userNetPaise += b.netPaise;
    });

    // Calculate each member's overall balance within the group
    const memberBalances = group.members.map((m) => {
      const mb = computeBilateralBalances(m.userId, mappedExpenses, mappedSettlements);
      let net = 0;
      mb.forEach((b) => (net += b.netPaise));

      return {
        userId: m.userId,
        name: m.user.name,
        username: m.user.username,
        image: m.user.image,
        role: m.role,
        netPaise: net,
      };
    });

    const totalGroupSpentPaise = group.expenses.reduce(
      (acc, exp) => acc + exp.amountPaise,
      0
    );

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        createdById: group.createdById,
        role: membership.role,
        members: group.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          username: m.user.username,
          image: m.user.image,
        })),
        expenses: group.expenses,
        settlements: group.settlements,
        memberBalances,
        totalExpensesPaise: totalGroupSpentPaise,
        userNetPaise,
        createdAt: group.createdAt,
      },
    });
  } catch (error) {
    console.error("Fetch group details error:", error);
    return NextResponse.json({ error: "Failed to fetch group details" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await context.params;

    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: currentUser.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a member" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.name?.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const updated = await db.group.update({
      where: { id: groupId },
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
      },
    });

    return NextResponse.json({ message: "Group updated", group: updated });
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
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

    const { id: groupId } = await context.params;

    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: currentUser.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Only group admins can delete the group" }, { status: 403 });
    }

    await db.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
