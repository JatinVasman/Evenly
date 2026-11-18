import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, sanitizeUser } from "@/lib/auth/session";
import { usernameSchema } from "@/lib/validations/auth";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [groupsCount, friendsCount, expensesCount] = await Promise.all([
      db.groupMember.count({ where: { userId: currentUser.id } }),
      db.friendship.count({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: currentUser.id },
            { recipientId: currentUser.id },
          ],
        },
      }),
      db.expense.count({
        where: {
          deletedAt: null,
          OR: [
            { payerId: currentUser.id },
            { splits: { some: { userId: currentUser.id } } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      user: currentUser,
      stats: {
        groupsCount,
        friendsCount,
        expensesCount,
      },
    });
  } catch (error) {
    console.error("Fetch profile stats error:", error);
    return NextResponse.json({ error: "Failed to fetch profile stats" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { name, username, image } = body;

    const dataToUpdate: Record<string, string | null> = {};

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      dataToUpdate.name = cleanName;
    }

    if (username !== undefined) {
      const parsed = usernameSchema.safeParse(username);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid username" }, { status: 400 });
      }

      const cleanUsername = parsed.data;

      // Check uniqueness if username changed
      if (cleanUsername !== currentUser.username) {
        const existing = await db.user.findUnique({
          where: { username: cleanUsername },
        });
        if (existing) {
          return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
        }
      }
      dataToUpdate.username = cleanUsername;
    }

    if (image !== undefined) {
      dataToUpdate.image = image ? String(image) : null;
    }

    const updatedUser = await db.user.update({
      where: { id: currentUser.id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
