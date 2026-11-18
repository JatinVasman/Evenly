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
    if (!body || !body.identifier) {
      return NextResponse.json({ error: "Username or email is required" }, { status: 400 });
    }

    const identifier = String(body.identifier).trim().toLowerCase().replace(/^@/, "");

    // Find recipient user by username or email
    const recipient = await db.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });

    if (!recipient) {
      return NextResponse.json({ error: "No user found with this username or email" }, { status: 404 });
    }

    if (recipient.id === currentUser.id) {
      return NextResponse.json({ error: "You cannot add yourself as a friend" }, { status: 400 });
    }

    // Check for existing friendship or request in either direction
    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, recipientId: recipient.id },
          { requesterId: recipient.id, recipientId: currentUser.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        return NextResponse.json({ error: "You are already friends with this user" }, { status: 409 });
      }
      if (existing.status === "PENDING") {
        if (existing.requesterId === currentUser.id) {
          return NextResponse.json({ error: "Friend request already sent and pending" }, { status: 409 });
        } else {
          // If the other user already sent a pending request, auto-accept it!
          await db.friendship.update({
            where: { id: existing.id },
            data: { status: "ACCEPTED" },
          });

          await recordActivity(currentUser.id, "FRIEND_REQUEST_ACCEPTED", "FRIENDSHIP", existing.id, {
            toUserName: recipient.name,
          });

          return NextResponse.json({
            message: `You and ${recipient.name} are now connected as friends!`,
            status: "ACCEPTED",
          });
        }
      }
      if (existing.status === "BLOCKED") {
        return NextResponse.json({ error: "Unable to send friend request" }, { status: 403 });
      }

      // If rejected earlier, reset to PENDING
      const updated = await db.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId: currentUser.id,
          recipientId: recipient.id,
          status: "PENDING",
        },
      });

      await recordActivity(currentUser.id, "FRIEND_REQUEST_SENT", "FRIENDSHIP", updated.id, {
        toUserName: recipient.name,
      });

      return NextResponse.json({
        message: `Friend request sent to ${recipient.name}`,
        friendshipId: updated.id,
      });
    }

    // Create new pending friendship
    const friendship = await db.friendship.create({
      data: {
        requesterId: currentUser.id,
        recipientId: recipient.id,
        status: "PENDING",
      },
    });

    await recordActivity(currentUser.id, "FRIEND_REQUEST_SENT", "FRIENDSHIP", friendship.id, {
      toUserName: recipient.name,
    });

    return NextResponse.json(
      {
        message: `Friend request sent to ${recipient.name}`,
        friendshipId: friendship.id,
        recipient: {
          id: recipient.id,
          name: recipient.name,
          username: recipient.username,
          image: recipient.image,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Friend request error:", error);
    return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 });
  }
}
