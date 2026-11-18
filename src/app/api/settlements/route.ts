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
    const friendId = searchParams.get("friendId");
    const groupId = searchParams.get("groupId");

    const whereClause: Record<string, unknown> = {};

    if (groupId) {
      whereClause.groupId = groupId;
    } else if (friendId) {
      whereClause.OR = [
        { payerId: currentUser.id, payeeId: friendId },
        { payerId: friendId, payeeId: currentUser.id },
      ];
    } else {
      whereClause.OR = [
        { payerId: currentUser.id },
        { payeeId: currentUser.id },
      ];
    }

    const settlements = await db.settlement.findMany({
      where: whereClause,
      include: {
        payer: { select: { id: true, name: true, username: true, image: true } },
        payee: { select: { id: true, name: true, username: true, image: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ settlements });
  } catch (error) {
    console.error("Fetch settlements error:", error);
    return NextResponse.json({ error: "Failed to fetch settlements" }, { status: 500 });
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
      payerId,
      payeeId,
      amountPaise,
      date,
      notes,
      groupId,
    } = body;

    const cleanAmountPaise = Math.round(Number(amountPaise));
    if (!cleanAmountPaise || cleanAmountPaise <= 0) {
      return NextResponse.json({ error: "Settlement amount must be greater than zero" }, { status: 400 });
    }

    if (!payerId || !payeeId) {
      return NextResponse.json({ error: "Payer and Payee are required" }, { status: 400 });
    }

    if (payerId === payeeId) {
      return NextResponse.json({ error: "Payer and payee cannot be the same user" }, { status: 400 });
    }

    // Either currentUser is payer or payee
    if (currentUser.id !== payerId && currentUser.id !== payeeId) {
      return NextResponse.json({ error: "You can only record settlements involving yourself" }, { status: 403 });
    }

    // Verify both users exist
    const [payer, payee] = await Promise.all([
      db.user.findUnique({ where: { id: payerId }, select: { id: true, name: true } }),
      db.user.findUnique({ where: { id: payeeId }, select: { id: true, name: true } }),
    ]);

    if (!payer || !payee) {
      return NextResponse.json({ error: "Payer or payee not found" }, { status: 404 });
    }

    // Record settlement
    const settlement = await db.settlement.create({
      data: {
        payerId,
        payeeId,
        amountPaise: cleanAmountPaise,
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null,
        groupId: groupId || null,
      },
      include: {
        payer: { select: { id: true, name: true, username: true } },
        payee: { select: { id: true, name: true, username: true } },
      },
    });

    // Record in ActivityLog
    await recordActivity(currentUser.id, "SETTLEMENT_RECORDED", "SETTLEMENT", settlement.id, {
      fromUserName: payer.name,
      toUserName: payee.name,
      amountPaise: cleanAmountPaise,
      note: notes?.trim(),
      groupId: groupId || undefined,
    });

    return NextResponse.json(
      {
        message: "Settlement recorded successfully",
        settlement,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create settlement error:", error);
    return NextResponse.json({ error: "Failed to record settlement" }, { status: 500 });
  }
}
