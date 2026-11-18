import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || (!body.friendshipId && !body.requesterId)) {
      return NextResponse.json({ error: "friendshipId or requesterId is required" }, { status: 400 });
    }

    const friendship = await db.friendship.findFirst({
      where: body.friendshipId
        ? { id: body.friendshipId, recipientId: currentUser.id }
        : { requesterId: body.requesterId, recipientId: currentUser.id },
      include: {
        requester: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Pending friend request not found" }, { status: 404 });
    }

    if (friendship.status === "ACCEPTED") {
      return NextResponse.json({ message: "Already accepted", friendship });
    }

    const updated = await db.friendship.update({
      where: { id: friendship.id },
      data: { status: "ACCEPTED" },
    });

    await recordActivity(currentUser.id, "FRIEND_REQUEST_ACCEPTED", "FRIENDSHIP", updated.id, {
      toUserName: friendship.requester.name,
    });

    return NextResponse.json({
      message: `Accepted friend request from ${friendship.requester.name}`,
      friendship: updated,
    });
  } catch (error) {
    console.error("Accept friend request error:", error);
    return NextResponse.json({ error: "Failed to accept friend request" }, { status: 500 });
  }
}
