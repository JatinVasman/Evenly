import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token: rawToken } = await context.params;
    if (!rawToken) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const invitation = await db.invitation.findUnique({
      where: { tokenHash },
      include: {
        inviter: {
          select: { id: true, name: true, username: true, image: true },
        },
        group: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation link" }, { status: 404 });
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: "This invitation link has already been used" }, { status: 410 });
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "This invitation link has expired" }, { status: 410 });
    }

    return NextResponse.json({
      inviter: invitation.inviter,
      group: invitation.group,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Validate invitation error:", error);
    return NextResponse.json({ error: "Failed to validate invitation" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized. Please log in or register first." }, { status: 401 });
    }

    const { token: rawToken } = await context.params;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const invitation = await db.invitation.findUnique({
      where: { tokenHash },
      include: {
        inviter: true,
        group: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation link" }, { status: 404 });
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: "This invitation link has already been used" }, { status: 410 });
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "This invitation link has expired" }, { status: 410 });
    }

    if (invitation.inviterId === currentUser.id) {
      return NextResponse.json({ error: "You cannot accept your own invitation link" }, { status: 400 });
    }

    // 1. Establish or accept Friendship
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: invitation.inviterId, recipientId: currentUser.id },
          { requesterId: currentUser.id, recipientId: invitation.inviterId },
        ],
      },
    });

    if (!existingFriendship) {
      await db.friendship.create({
        data: {
          requesterId: invitation.inviterId,
          recipientId: currentUser.id,
          status: "ACCEPTED",
        },
      });
      await recordActivity(currentUser.id, "FRIEND_REQUEST_ACCEPTED", "FRIENDSHIP", currentUser.id, {
        toUserName: invitation.inviter.name,
      });
    } else if (existingFriendship.status !== "ACCEPTED") {
      await db.friendship.update({
        where: { id: existingFriendship.id },
        data: { status: "ACCEPTED" },
      });
      await recordActivity(currentUser.id, "FRIEND_REQUEST_ACCEPTED", "FRIENDSHIP", existingFriendship.id, {
        toUserName: invitation.inviter.name,
      });
    }

    // 2. If invitation had a groupId, join group
    if (invitation.groupId) {
      const existingMember = await db.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: invitation.groupId,
            userId: currentUser.id,
          },
        },
      });

      if (!existingMember) {
        await db.groupMember.create({
          data: {
            groupId: invitation.groupId,
            userId: currentUser.id,
            role: "MEMBER",
          },
        });
        await recordActivity(currentUser.id, "GROUP_MEMBER_ADDED", "GROUP", invitation.groupId, {
          groupName: invitation.group?.name,
        });
      }
    }

    // Mark invitation used
    await db.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({
      message: `You are now connected with ${invitation.inviter.name}!`,
      inviter: {
        id: invitation.inviter.id,
        name: invitation.inviter.name,
        username: invitation.inviter.username,
      },
      groupId: invitation.groupId,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
