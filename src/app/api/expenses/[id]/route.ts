import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: expenseId } = await context.params;

    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: {
        payer: { select: { id: true, name: true, username: true, image: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, username: true, image: true } },
          },
        },
        group: { select: { id: true, name: true } },
      },
    });

    if (!expense || expense.deletedAt) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Authorization: User must be payer, a split participant, or group member
    const isPayer = expense.payerId === currentUser.id;
    const isParticipant = expense.splits.some((s) => s.userId === currentUser.id);

    if (!isPayer && !isParticipant && expense.groupId) {
      const membership = await db.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: expense.groupId,
            userId: currentUser.id,
          },
        },
      });
      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Fetch expense error:", error);
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
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

    const { id: expenseId } = await context.params;

    const existingExpense = await db.expense.findUnique({
      where: { id: expenseId },
      include: { splits: true },
    });

    if (!existingExpense || existingExpense.deletedAt) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
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

    const cleanAmountPaise = Math.round(Number(amountPaise));
    if (!cleanAmountPaise || cleanAmountPaise <= 0) {
      return NextResponse.json({ error: "Expense amount must be greater than zero" }, { status: 400 });
    }

    // Validate splits sum
    const sumSplitsPaise = splits.reduce((acc: number, s: { amountPaise: number }) => acc + Math.round(Number(s.amountPaise) || 0), 0);
    if (sumSplitsPaise !== cleanAmountPaise) {
      return NextResponse.json(
        {
          error: `Split amounts sum (₹${(sumSplitsPaise / 100).toFixed(2)}) must exactly equal total amount (₹${(cleanAmountPaise / 100).toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Update in transaction
    const updated = await db.$transaction(async (tx) => {
      const exp = await tx.expense.update({
        where: { id: expenseId },
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

      // Delete existing splits and insert updated splits
      await tx.expenseSplit.deleteMany({
        where: { expenseId },
      });

      const splitData = splits.map((s: { userId: string; amountPaise: number }) => ({
        expenseId: exp.id,
        userId: s.userId,
        amountPaise: Math.round(Number(s.amountPaise)),
      }));

      await tx.expenseSplit.createMany({
        data: splitData,
      });

      return exp;
    });

    await recordActivity(currentUser.id, "EXPENSE_EDITED", "EXPENSE", updated.id, {
      title: updated.description,
      amountPaise: updated.amountPaise,
    });

    return NextResponse.json({ message: "Expense updated successfully", expense: updated });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
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

    const { id: expenseId } = await context.params;

    const expense = await db.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.deletedAt) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Soft delete
    await db.expense.update({
      where: { id: expenseId },
      data: { deletedAt: new Date() },
    });

    await recordActivity(currentUser.id, "EXPENSE_DELETED", "EXPENSE", expense.id, {
      title: expense.description,
      amountPaise: expense.amountPaise,
    });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
