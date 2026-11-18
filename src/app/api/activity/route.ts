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

    const activities = await db.activityLog.findMany({
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
