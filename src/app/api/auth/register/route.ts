import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  sanitizeUser,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || null;

    // Rate limit registration requests: max 5 attempts per 10 minutes per IP
    const rateLimit = checkRateLimit(`register:${ipAddress}`, 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError, details: parseResult.error.issues }, { status: 400 });
    }

    const { name, username, email, password } = parseResult.data;

    // Check username uniqueness (case-insensitive via normalized lowercase username)
    const existingUsername = await db.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    // Check email uniqueness (case-insensitive via normalized lowercase email)
    const existingEmail = await db.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Email address is already registered" }, { status: 409 });
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Create user in database
    const user = await db.user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
      },
    });

    // Create database-backed session
    const { rawToken } = await createSession(user.id, {
      userAgent,
      ipAddress,
      rememberMe: true,
    });

    // Set HttpOnly cookie on response
    const response = NextResponse.json(
      {
        user: sanitizeUser(user),
        message: "Registration successful",
      },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions(true));

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error during registration" }, { status: 500 });
  }
}
