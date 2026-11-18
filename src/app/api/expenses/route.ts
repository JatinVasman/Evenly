import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const friendId = searchParams.get("friendId");

    const whereClause: Record<string, unknown> = {
      deletedAt: null,
    };

    if (groupId) {
      // Verify user is member of this group
      const member = await db.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: currentUser.id,
          },
        },
      });
      if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      whereClause.groupId = groupId;
    } else if (friendId) {
      // Expenses involving both currentUser and friendId
      whereClause.AND = [
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
      ];
    } else {
      // All expenses involving currentUser
      whereClause.OR = [
        { payerId: currentUser.id },
        { splits: { some: { userId: currentUser.id } } },
      ];
    }

    const expenses = await db.expense.findMany({
      where: whereClause,
      include: {
        payer: { select: { id: true, name: true, username: true, image: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
        group: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Fetch expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const {
      description,
      amountPaise,
      date,
      payerId,
      groupId,
      splitType = "EQUAL",
      category,
      notes,
      splits,
    } = body;

    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Expense description is required" }, { status: 400 });
    }

    const cleanAmountPaise = Math.round(Number(amountPaise));
    if (!cleanAmountPaise || cleanAmountPaise <= 0) {
      return NextResponse.json({ error: "Expense amount must be greater than zero" }, { status: 400 });
    }

    if (!payerId) {
      return NextResponse.json({ error: "Payer is required" }, { status: 400 });
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json({ error: "At least one participant split is required" }, { status: 400 });
    }

    // Validate that sum of splits exactly equals amountPaise (zero drift guarantee)
    const sumSplitsPaise = splits.reduce((acc: number, s: { amountPaise: number }) => acc + Math.round(Number(s.amountPaise) || 0), 0);
    if (sumSplitsPaise !== cleanAmountPaise) {
      return NextResponse.json(
        {
          error: `Split amounts sum (₹${(sumSplitsPaise / 100).toFixed(2)}) must exactly equal total amount (₹${(cleanAmountPaise / 100).toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Authorization checks:
    // If groupId is provided, verify current user and all participants belong to the group
    if (groupId) {
      const groupMembers = await db.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
      });
      const memberIdSet = new Set(groupMembers.map((m) => m.userId));

      if (!memberIdSet.has(currentUser.id)) {
        return NextResponse.json({ error: "Forbidden: You are not a member of this group" }, { status: 403 });
      }

      if (!memberIdSet.has(payerId)) {
        return NextResponse.json({ error: "Payer must be a member of the group" }, { status: 400 });
      }

      for (const s of splits) {
        if (!memberIdSet.has(s.userId)) {
          return NextResponse.json({ error: "All split participants must be members of the group" }, { status: 400 });
        }
      }
    }

    // Create expense and splits in a database transaction
    const expense = await db.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          description: description.trim(),
          amountPaise: cleanAmountPaise,
          date: date ? new Date(date) : new Date(),
          payerId,
          groupId: groupId || null,
          splitType: splitType === "CUSTOM" ? "CUSTOM" : "EQUAL",
          category: category || null,
          notes: notes?.trim() || null,
        },
      });

      const splitData = splits.map((s: { userId: string; amountPaise: number }) => ({
        expenseId: newExpense.id,
        userId: s.userId,
        amountPaise: Math.round(Number(s.amountPaise)),
      }));

      await tx.expenseSplit.createMany({
        data: splitData,
      });

      return newExpense;
    });

    // Record Activity
    let groupName: string | undefined;
    if (groupId) {
      const grp = await db.group.findUnique({ where: { id: groupId }, select: { name: true } });
      groupName = grp?.name;
    }

    await recordActivity(currentUser.id, "EXPENSE_ADDED", "EXPENSE", expense.id, {
      title: expense.description,
      amountPaise: expense.amountPaise,
      groupName,
      groupId: groupId || undefined,
    });

    return NextResponse.json(
      {
        message: "Expense created successfully",
        expense,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
