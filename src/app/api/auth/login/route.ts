import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  sanitizeUser,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || null;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { identifier, password, rememberMe } = parseResult.data;
    const rateLimitKey = `login:${ipAddress}:${identifier}`;

    // Rate limiting: max 5 attempts per 5 minutes
    const rateLimit = checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Lookup user by normalized lowercase email OR username
    const user = await db.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });

    // Generic error message if user does not exist
    if (!user) {
      return NextResponse.json({ error: "Invalid username/email or password" }, { status: 401 });
    }

    // Verify Argon2id password hash
    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid username/email or password" }, { status: 401 });
    }

    // Password verified: reset rate limit attempts
    resetRateLimit(rateLimitKey);

    // Create database session
    const { rawToken } = await createSession(user.id, {
      userAgent,
      ipAddress,
      rememberMe: Boolean(rememberMe),
    });

    // Set HttpOnly cookie on response
    const response = NextResponse.json({
      user: sanitizeUser(user),
      message: "Login successful",
    });

    response.cookies.set(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions(Boolean(rememberMe)));

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error during login" }, { status: 500 });
  }
}
