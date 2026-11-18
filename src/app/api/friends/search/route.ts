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
    const query = searchParams.get("q")?.trim().toLowerCase().replace(/^@/, "");

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search users matching username or email
    const users = await db.user.findMany({
      where: {
        AND: [
          { id: { not: currentUser.id } },
          {
            OR: [
              { username: { contains: query } },
              { email: { contains: query } },
              { name: { contains: query } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
      },
      take: 10,
    });

    if (users.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const targetUserIds = users.map((u) => u.id);

    // Fetch existing friendship relations with these users
    const existingFriendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: currentUser.id, recipientId: { in: targetUserIds } },
          { requesterId: { in: targetUserIds }, recipientId: currentUser.id },
        ],
      },
    });

    const results = users.map((u) => {
      const relation = existingFriendships.find(
        (f) =>
          (f.requesterId === currentUser.id && f.recipientId === u.id) ||
          (f.requesterId === u.id && f.recipientId === currentUser.id)
      );

      let friendshipStatus: "NONE" | "ACCEPTED" | "PENDING_INCOMING" | "PENDING_OUTGOING" = "NONE";
      let friendshipId: string | undefined;

      if (relation) {
        friendshipId = relation.id;
        if (relation.status === "ACCEPTED") {
          friendshipStatus = "ACCEPTED";
        } else if (relation.status === "PENDING") {
          friendshipStatus =
            relation.requesterId === currentUser.id
              ? "PENDING_OUTGOING"
              : "PENDING_INCOMING";
        }
      }

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        image: u.image,
        friendshipStatus,
        friendshipId,
      };
    });

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error("Search friends error:", error);
    return NextResponse.json({ error: "Failed to search friends" }, { status: 500 });
  }
}
