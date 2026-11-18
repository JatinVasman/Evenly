import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.friendshipId) {
      return NextResponse.json({ error: "friendshipId is required" }, { status: 400 });
    }

    const friendship = await db.friendship.findFirst({
      where: {
        id: body.friendshipId,
        requesterId: currentUser.id,
        status: "PENDING",
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Pending request not found" }, { status: 404 });
    }

    await db.friendship.delete({
      where: { id: friendship.id },
    });

    return NextResponse.json({ message: "Friend request cancelled" });
  } catch (error) {
    console.error("Cancel friend request error:", error);
    return NextResponse.json({ error: "Failed to cancel friend request" }, { status: 500 });
  }
}
