import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/activity";
import { computeBilateralBalances } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all groups where current user is a member
    const memberships = await db.groupMember.findMany({
      where: { userId: currentUser.id },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, username: true, image: true } },
              },
            },
            expenses: {
              where: { deletedAt: null },
              include: { splits: true },
            },
            settlements: true,
          },
        },
      },
      orderBy: { group: { updatedAt: "desc" } },
    });

    const groupsWithBalances = memberships.map((m) => {
      const g = m.group;

      const mappedExpenses = g.expenses.map((e) => ({
        id: e.id,
        totalAmountPaise: e.amountPaise,
        paidById: e.payerId,
        deletedAt: null,
        splits: e.splits.map((s) => ({ userId: s.userId, amountPaise: s.amountPaise })),
      }));

      const mappedSettlements = g.settlements.map((s) => ({
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

      let netPaise = 0;
      bilateralBalances.forEach((b) => {
        netPaise += b.netPaise;
      });

      const totalExpensesPaise = g.expenses.reduce((acc, exp) => acc + exp.amountPaise, 0);

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        createdById: g.createdById,
        role: m.role,
        membersCount: g.members.length,
        members: g.members.map((mem) => ({
          userId: mem.userId,
          role: mem.role,
          name: mem.user.name,
          username: mem.user.username,
          image: mem.user.image,
        })),
        expensesCount: g.expenses.length,
        totalExpensesPaise,
        userNetPaise: netPaise,
        updatedAt: g.updatedAt,
      };
    });

    return NextResponse.json({ groups: groupsWithBalances });
  } catch (error) {
    console.error("Fetch groups error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const name = body.name.trim();
    const description = body.description?.trim() || null;
    const memberUserIds: string[] = Array.isArray(body.memberUserIds) ? body.memberUserIds : [];

    // Ensure creator is included
    const allMemberIds = Array.from(new Set([currentUser.id, ...memberUserIds]));

    // Create group and group members inside a transaction
    const group = await db.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name,
          description,
          createdById: currentUser.id,
        },
      });

      // Add members
      const memberData = allMemberIds.map((userId) => ({
        groupId: newGroup.id,
        userId,
        role: userId === currentUser.id ? "ADMIN" : "MEMBER",
      }));

      await tx.groupMember.createMany({
        data: memberData,
      });

      return newGroup;
    });

    // Record Activity
    await recordActivity(currentUser.id, "GROUP_CREATED", "GROUP", group.id, {
      groupName: group.name,
      membersCount: allMemberIds.length,
    });

    return NextResponse.json(
      {
        message: "Group created successfully",
        group,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
