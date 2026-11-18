import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const groupId = body.groupId ? String(body.groupId) : null;

    if (groupId) {
      // Verify user is a member of the group
      const membership = await db.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: currentUser.id,
          },
        },
      });
      if (!membership) {
        return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
      }
    }

    // Generate secure random invite token
    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Expiration: 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.invitation.create({
      data: {
        tokenHash,
        inviterId: currentUser.id,
        groupId,
        expiresAt,
      },
    });

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const inviteUrl = `${protocol}://${host}/invite/${rawToken}`;

    return NextResponse.json({
      rawToken,
      inviteUrl,
      expiresAt,
    }, { status: 201 });
  } catch (error) {
    console.error("Create invitation error:", error);
    return NextResponse.json({ error: "Failed to create invitation link" }, { status: 500 });
  }
}
