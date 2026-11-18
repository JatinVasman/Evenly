import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { verifyPassword } from "../src/lib/auth/password";
import {
  createSession,
  validateSessionToken,
  revokeSession,
  revokeAllUserSessions,
  hashSessionToken,
} from "../src/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "../src/lib/auth/rateLimit";
import { POST as registerHandler } from "../src/app/api/auth/register/route";
import { POST as loginHandler } from "../src/app/api/auth/login/route";
import { NextRequest } from "next/server";

// Helper to create mock NextRequest
function createJsonRequest(url: string, body: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("Step 3: Registration, Login & Session Handlers Integration Tests", () => {
  const testUsername = `user_${Date.now()}`;
  const testEmail = `${testUsername}@example.com`;
  const testPassword = "super_secure_passphrase_2026";
  let createdUserId: string | null = null;

  after(async () => {
    // Cleanup any created test users and sessions
    if (createdUserId) {
      await db.session.deleteMany({ where: { userId: createdUserId } });
      await db.user.deleteMany({ where: { id: createdUserId } });
    }
    // Cleanup any other test users created with user_ prefix
    const testUsers = await db.user.findMany({
      where: {
        OR: [
          { username: { startsWith: "user_" } },
          { username: { startsWith: "api_test_" } },
        ],
      },
    });
    for (const u of testUsers) {
      await db.session.deleteMany({ where: { userId: u.id } });
      await db.user.deleteMany({ where: { id: u.id } });
    }
  });

  describe("1. Registration API (POST /api/auth/register)", () => {
    it("successfully registers a new user, hashes password with Argon2id and sets session cookie", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/register", {
        name: "Test Engineer",
        username: testUsername,
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      }, {
        "x-forwarded-for": "192.168.1.101",
      });

      const res = await registerHandler(req);
      assert.strictEqual(res.status, 201);

      const data = await res.json();
      assert.strictEqual(data.message, "Registration successful");
      assert.strictEqual(data.user.username, testUsername);
      assert.strictEqual(data.user.email, testEmail);
      assert.strictEqual(data.user.name, "Test Engineer");
      assert.strictEqual(data.user.passwordHash, undefined, "Never expose passwordHash to client");

      createdUserId = data.user.id;

      // Verify user was saved in DB
      const dbUser = await db.user.findUnique({ where: { id: createdUserId! } });
      assert.ok(dbUser);
      assert.strictEqual(dbUser.username, testUsername);

      // Verify password was hashed with Argon2id
      assert.ok(dbUser.passwordHash.startsWith("$argon2id$"));
      const passwordMatches = await verifyPassword(dbUser.passwordHash, testPassword);
      assert.strictEqual(passwordMatches, true);

      // Verify session cookie was set
      const cookieHeader = res.headers.get("set-cookie") || "";
      const cookieObj = res.cookies.get("evenly_session");
      assert.ok(cookieObj || cookieHeader.includes("evenly_session="));
      if (cookieObj) {
        assert.strictEqual(cookieObj.httpOnly, true);
        assert.strictEqual(String(cookieObj.sameSite).toLowerCase(), "lax");
      } else {
        assert.ok(cookieHeader.toLowerCase().includes("httponly"));
        assert.ok(cookieHeader.toLowerCase().includes("samesite=lax"));
      }
    });

    it("rejects registration with duplicate username (409 Conflict)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/register", {
        name: "Another Person",
        username: testUsername.toUpperCase(), // Test case-insensitive collision
        email: `different_${Date.now()}@example.com`,
        password: testPassword,
        confirmPassword: testPassword,
      }, {
        "x-forwarded-for": "192.168.1.102",
      });

      const res = await registerHandler(req);
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, "Username is already taken");
    });

    it("rejects registration with duplicate email (409 Conflict)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/register", {
        name: "Another Person",
        username: `unique_${Date.now()}`,
        email: testEmail.toUpperCase(), // Test case-insensitive collision
        password: testPassword,
        confirmPassword: testPassword,
      }, {
        "x-forwarded-for": "192.168.1.103",
      });

      const res = await registerHandler(req);
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error, "Email address is already registered");
    });

    it("rejects registration with mismatched passwords (400 Bad Request)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/register", {
        name: "Mismatch User",
        username: `mismatch_${Date.now()}`,
        email: `mismatch_${Date.now()}@example.com`,
        password: "firstPassword123",
        confirmPassword: "differentPassword456",
      }, {
        "x-forwarded-for": "192.168.1.104",
      });

      const res = await registerHandler(req);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, "Passwords do not match");
    });

    it("rejects registration with invalid username (400 Bad Request)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/register", {
        name: "Invalid Username",
        username: ".invalid_start",
        email: `invalid_${Date.now()}@example.com`,
        password: testPassword,
        confirmPassword: testPassword,
      }, {
        "x-forwarded-for": "192.168.1.105",
      });

      const res = await registerHandler(req);
      assert.strictEqual(res.status, 400);
    });
  });

  describe("2. Login API (POST /api/auth/login)", () => {
    it("successfully logs in using USERNAME + password", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", {
        identifier: testUsername,
        password: testPassword,
        rememberMe: true,
      }, {
        "x-forwarded-for": "192.168.1.110",
      });

      const res = await loginHandler(req);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.strictEqual(data.message, "Login successful");
      assert.strictEqual(data.user.id, createdUserId);
      assert.strictEqual(data.user.username, testUsername);

      const cookieHeader = res.headers.get("set-cookie");
      assert.ok(cookieHeader);
      assert.ok(cookieHeader.includes("evenly_session="));
    });

    it("successfully logs in using EMAIL + password (case-insensitive)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", {
        identifier: testEmail.toUpperCase(),
        password: testPassword,
        rememberMe: false,
      }, {
        "x-forwarded-for": "192.168.1.111",
      });

      const res = await loginHandler(req);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.strictEqual(data.message, "Login successful");
      assert.strictEqual(data.user.id, createdUserId);
    });

    it("rejects login with incorrect password with generic error message (401)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", {
        identifier: testUsername,
        password: "wrong_password_attempt",
      }, {
        "x-forwarded-for": "192.168.1.112",
      });

      const res = await loginHandler(req);
      assert.strictEqual(res.status, 401);

      const data = await res.json();
      assert.strictEqual(data.error, "Invalid username/email or password");
    });

    it("rejects login with non-existent user with identical generic error message (401)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", {
        identifier: "completely_nonexistent_user",
        password: "anyPassword123",
      }, {
        "x-forwarded-for": "192.168.1.113",
      });

      const res = await loginHandler(req);
      assert.strictEqual(res.status, 401);

      const data = await res.json();
      assert.strictEqual(data.error, "Invalid username/email or password");
    });
  });

  describe("3. Database Session Management & Security", () => {
    it("hashes session tokens in the database using SHA-256 (raw token never stored)", async () => {
      const { rawToken, session } = await createSession(createdUserId!, {
        userAgent: "TestBrowser/1.0",
        ipAddress: "127.0.0.1",
        rememberMe: true,
      });

      assert.ok(rawToken);
      assert.strictEqual(rawToken.length, 64); // 32 bytes hex = 64 hex chars

      // Database record must have the SHA-256 hash, NOT the raw token
      const expectedHash = hashSessionToken(rawToken);
      assert.strictEqual(session.tokenHash, expectedHash);

      const dbSession = await db.session.findUnique({
        where: { tokenHash: expectedHash },
      });
      assert.ok(dbSession);
      assert.strictEqual(dbSession.tokenHash, expectedHash);
      assert.strictEqual(dbSession.userId, createdUserId);
    });

    it("validates valid session token and retrieves user", async () => {
      const { rawToken } = await createSession(createdUserId!, {
        userAgent: "TestBrowser/1.0",
      });

      const validated = await validateSessionToken(rawToken);
      assert.ok(validated);
      assert.strictEqual(validated.user.id, createdUserId);
      assert.strictEqual(validated.user.username, testUsername);
      assert.strictEqual("passwordHash" in validated.user, false, "Sanitized user must not have passwordHash");
    });

    it("rejects expired session tokens", async () => {
      // Create a session that expired 1 hour ago
      const token = "expired_raw_token_test_1234567890abcdef1234567890abcdef";
      const tokenHash = hashSessionToken(token);

      await db.session.create({
        data: {
          tokenHash,
          userId: createdUserId!,
          expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hr in past
        },
      });

      const validated = await validateSessionToken(token);
      assert.strictEqual(validated, null);
    });

    it("revokes single session on logout", async () => {
      const { rawToken } = await createSession(createdUserId!);
      const validatedBefore = await validateSessionToken(rawToken);
      assert.ok(validatedBefore);

      await revokeSession(rawToken);

      const validatedAfter = await validateSessionToken(rawToken);
      assert.strictEqual(validatedAfter, null);
    });

    it("revokes all active sessions when user changes password", async () => {
      const s1 = await createSession(createdUserId!);
      const s2 = await createSession(createdUserId!);

      assert.ok(await validateSessionToken(s1.rawToken));
      assert.ok(await validateSessionToken(s2.rawToken));

      await revokeAllUserSessions(createdUserId!);

      assert.strictEqual(await validateSessionToken(s1.rawToken), null);
      assert.strictEqual(await validateSessionToken(s2.rawToken), null);
    });
  });

  describe("4. Rate Limiting", () => {
    it("enforces sliding-window rate limit after threshold is reached", () => {
      const key = `test_limit_${Date.now()}`;
      resetRateLimit(key);

      // Max 3 requests in 1 minute
      const r1 = checkRateLimit(key, 3, 60000);
      assert.strictEqual(r1.allowed, true);
      assert.strictEqual(r1.remaining, 2);

      const r2 = checkRateLimit(key, 3, 60000);
      assert.strictEqual(r2.allowed, true);
      assert.strictEqual(r2.remaining, 1);

      const r3 = checkRateLimit(key, 3, 60000);
      assert.strictEqual(r3.allowed, true);
      assert.strictEqual(r3.remaining, 0);

      // 4th request must be rejected
      const r4 = checkRateLimit(key, 3, 60000);
      assert.strictEqual(r4.allowed, false);
      assert.strictEqual(r4.remaining, 0);
      assert.ok(r4.retryAfterSeconds > 0);

      // Reset works
      resetRateLimit(key);
      const r5 = checkRateLimit(key, 3, 60000);
      assert.strictEqual(r5.allowed, true);
    });
  });
});
