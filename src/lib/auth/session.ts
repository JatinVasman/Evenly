import crypto from "node:crypto";
import { db } from "@/lib/db";
import { type User, type Session } from "@prisma/client";

export const SESSION_COOKIE_NAME = "evenly_session";
export const SESSION_DURATION_DAYS = 30; // 30 days for regular/rememberMe sessions
export const SESSION_DURATION_SHORT_DAYS = 1; // 1 day if rememberMe is false

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Strips sensitive fields (like passwordHash) from a User record.
 */
export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    image: user.image,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Hashes a raw session token using SHA-256 before database lookup/storage.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a secure random session token and persists its hash in the database.
 * Returns the raw token (to be sent via HttpOnly cookie) and the database session record.
 */
export async function createSession(
  userId: string,
  options?: {
    userAgent?: string | null;
    ipAddress?: string | null;
    rememberMe?: boolean;
  }
): Promise<{ session: Session; rawToken: string }> {
  // Generate cryptographically secure 256-bit random token (64 hex characters)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);

  const durationDays = options?.rememberMe !== false ? SESSION_DURATION_DAYS : SESSION_DURATION_SHORT_DAYS;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const session = await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: options?.userAgent?.slice(0, 500) || null,
      ipAddress: options?.ipAddress?.slice(0, 100) || null,
    },
  });

  return { session, rawToken };
}

/**
 * Validates a raw session token against the database.
 * Enforces expiration, revocation, and performs sliding window renewal.
 */
export async function validateSessionToken(
  rawToken: string
): Promise<{ session: Session; user: SafeUser } | null> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length !== 64) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);

  const sessionWithUser = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!sessionWithUser) {
    return null;
  }

  const { user, ...session } = sessionWithUser;

  // Check if session has been revoked
  if (session.revokedAt !== null) {
    return null;
  }

  // Check if session has expired
  const now = new Date();
  if (session.expiresAt < now) {
    return null;
  }

  // Sliding window extension: if halfway to expiration, extend by 30 days
  const halfwayThreshold = new Date(
    session.createdAt.getTime() + (session.expiresAt.getTime() - session.createdAt.getTime()) / 2
  );

  if (now > halfwayThreshold) {
    const newExpiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });
    session.expiresAt = newExpiresAt;
  }

  return { session, user: sanitizeUser(user) };
}

/**
 * Revokes an individual session by raw token.
 */
export async function revokeSession(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const tokenHash = hashSessionToken(rawToken);

  try {
    await db.session.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Revokes all active sessions for a given user (e.g. on password change/reset).
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
  return result.count;
}

/**
 * Extracts and validates the authenticated user from the incoming NextRequest.
 */
export async function getAuthenticatedUser(req: Request | { cookies: { get: (name: string) => { value?: string } | undefined } }): Promise<SafeUser | null> {
  let token: string | undefined;

  if ("cookies" in req && typeof req.cookies?.get === "function") {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else if ("headers" in req && typeof (req as Request).headers?.get === "function") {
    const cookieHeader = (req as Request).headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
      token = match ? decodeURIComponent(match[1]) : undefined;
    }
  }

  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user || null;
}

/**
 * Cookie configuration options for standard HttpOnly session cookies.
 */
export function getSessionCookieOptions(rememberMe: boolean = true) {
  const durationDays = rememberMe ? SESSION_DURATION_DAYS : SESSION_DURATION_SHORT_DAYS;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: durationDays * 24 * 60 * 60,
  };
}
