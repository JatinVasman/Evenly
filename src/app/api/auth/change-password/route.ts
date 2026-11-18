import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/validations/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionData = await validateSessionToken(sessionToken);
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized or session expired" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const parseResult = changePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { currentPassword, newPassword } = parseResult.data;

    // Fetch user with current password hash
    const user = await db.user.findUnique({
      where: { id: sessionData.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Revoke all sessions except potentially keeping or revoking all sessions
    await db.session.deleteMany({
      where: {
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
