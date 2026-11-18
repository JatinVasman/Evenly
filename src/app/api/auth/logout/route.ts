import { NextRequest, NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      await revokeSession(sessionToken);
    }

    // Clear session cookie on response
    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...getSessionCookieOptions(false),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error during logout" }, { status: 500 });
  }
}
