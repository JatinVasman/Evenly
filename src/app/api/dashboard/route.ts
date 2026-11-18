import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { computeBilateralBalances, getUserBalanceBreakdown } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch expenses, settlements, and group membership in parallel
    const [expenses, settlements, membership] = await Promise.all([
      db.expense.findMany({
        where: {
          deletedAt: null,
          OR: [
            { payerId: currentUser.id },
            { splits: { some: { userId: currentUser.id } } },
          ],
        },
        include: {
          payer: { select: { id: true, name: true, username: true, image: true } },
          splits: {
            include: {
              user: { select: { id: true, name: true, username: true, image: true } },
            },
          },
          group: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
      }),
      db.settlement.findMany({
        where: {
          OR: [
            { payerId: currentUser.id },
            { payeeId: currentUser.id },
          ],
        },
        include: {
          payer: { select: { id: true, name: true, username: true } },
          payee: { select: { id: true, name: true, username: true } },
        },
        orderBy: { date: "desc" },
      }),
      db.groupMember.findFirst({
        where: { userId: currentUser.id },
        include: {
          group: {
            include: {
              members: {
                include: { user: { select: { id: true, name: true, username: true, image: true } } },
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
      }),
    ]);

    // 2. Collect directory of all related users
    const userMap = new Map<string, { id: string; name: string; username: string; image?: string | null }>();
    for (const exp of expenses) {
      userMap.set(exp.payer.id, exp.payer);
      for (const s of exp.splits) {
        userMap.set(s.user.id, s.user);
      }
    }
    for (const st of settlements) {
      userMap.set(st.payer.id, st.payer);
      userMap.set(st.payee.id, st.payee);
    }

    const mappedExpenses = expenses.map((e) => ({
      id: e.id,
      totalAmountPaise: e.amountPaise,
      paidById: e.payerId,
      deletedAt: null,
      splits: e.splits.map((s) => ({ userId: s.userId, amountPaise: s.amountPaise })),
    }));

    const mappedSettlements = settlements.map((s) => ({
      id: s.id,
      fromUserId: s.payerId,
      toUserId: s.payeeId,
      amountPaise: s.amountPaise,
    }));

    // 4. Calculate detailed user balance breakdown (OWED TO YOU & YOU OWE)
    const balanceBreakdown = getUserBalanceBreakdown(
      currentUser.id,
      mappedExpenses,
      mappedSettlements,
      Array.from(userMap.values())
    );

    // 5. Total my share of expenses spent
    const totalMySharePaise = expenses.reduce((acc, exp) => {
      const mySplit = exp.splits.find((s) => s.userId === currentUser.id);
      return acc + (mySplit ? mySplit.amountPaise : 0);
    }, 0);

    // 6. Process recent group
    let recentGroupData = null;
    if (membership?.group) {
      const grp = membership.group;
      const grpExp = grp.expenses.map((e) => ({
        id: e.id,
        totalAmountPaise: e.amountPaise,
        paidById: e.payerId,
        deletedAt: null,
        splits: e.splits.map((s) => ({ userId: s.userId, amountPaise: s.amountPaise })),
      }));
      const grpSt = grp.settlements.map((s) => ({
        id: s.id,
        fromUserId: s.payerId,
        toUserId: s.payeeId,
        amountPaise: s.amountPaise,
      }));
      const grpBals = computeBilateralBalances(currentUser.id, grpExp, grpSt);
      let grpNet = 0;
      grpBals.forEach((b) => (grpNet += b.netPaise));

      recentGroupData = {
        id: grp.id,
        name: grp.name,
        description: grp.description,
        membersCount: grp.members.length,
        members: grp.members.map((m) => m.user),
        expensesCount: grp.expenses.length,
        userNetPaise: grpNet,
      };
    }

    // 7. Format recent expenses for direct display on Home
    const recentExpenses = expenses.slice(0, 6).map((e) => ({
      id: e.id,
      description: e.description,
      amountPaise: e.amountPaise,
      date: e.date.toISOString(),
      payer: e.payer,
      group: e.group,
      mySharePaise: e.splits.find((s) => s.userId === currentUser.id)?.amountPaise || 0,
    }));

    return NextResponse.json({
      balanceBreakdown,
      totalMySharePaise,
      recentGroup: recentGroupData,
      recentExpenses,
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
