import { NextRequest, NextResponse } from "next/server";
import { validateSessionToken, SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const sessionData = await validateSessionToken(sessionToken);
    if (!sessionData) {
      // Invalid, expired, or revoked session: clear cookie
      const res = NextResponse.json({ user: null }, { status: 401 });
      res.cookies.set(SESSION_COOKIE_NAME, "", {
        ...getSessionCookieOptions(false),
        maxAge: 0,
      });
      return res;
    }

    return NextResponse.json({ user: sessionData.user });
  } catch (error) {
    console.error("Auth me check error:", error);
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}
