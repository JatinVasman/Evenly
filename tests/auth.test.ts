import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  USERNAME_REGEX,
  usernameSchema,
  passwordSchema,
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../src/lib/validations/auth";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

describe("Instagram-Style Username Validation", () => {
  const validUsernames = [
    "alex",
    "alex.morgan",
    "alex_22",
    "alex.dev",
    "user_123",
    "abc",
    "a_b",
    "a.b",
    "user_name_test",
    "dev.2026.app",
    "a".repeat(30), // Exactly 30 chars
  ];

  for (const u of validUsernames) {
    it(`accepts valid username: "${u}"`, () => {
      assert.strictEqual(USERNAME_REGEX.test(u), true);
      const parsed = usernameSchema.safeParse(u);
      assert.strictEqual(parsed.success, true);
    });
  }

  it("normalizes uppercase usernames to lowercase", () => {
    const result = usernameSchema.safeParse("  Alex.Morgan  ");
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data, "alex.morgan");
    }
  });

  const invalidUsernames: [string, string][] = [
    [".alex", "starts with a period"],
    ["alex.", "ends with a period"],
    ["alex..dev", "consecutive periods"],
    ["alex@dev", "special character @"],
    ["alex morgan", "contains space"],
    ["ab", "less than 3 characters"],
    ["a", "single character"],
    ["", "empty string"],
    ["_alex", "starts with an underscore"],
    ["a".repeat(31), "exceeds 30 characters"],
    ["user#name", "special character #"],
    ["user$name", "special character $"],
  ];

  for (const [u, reason] of invalidUsernames) {
    it(`rejects invalid username: "${u}" (${reason})`, () => {
      const parsed = usernameSchema.safeParse(u);
      assert.strictEqual(parsed.success, false, `Expected "${u}" to be rejected`);
    });
  }
});

describe("Password Rules & Passphrases", () => {
  it("accepts passwords with 8 or more characters", () => {
    assert.strictEqual(passwordSchema.safeParse("12345678").success, true);
    assert.strictEqual(passwordSchema.safeParse("mypassword").success, true);
  });

  it("accepts strong multi-word passphrases without demanding arbitrary symbols", () => {
    const passphrase = "correct horse battery staple";
    assert.strictEqual(passwordSchema.safeParse(passphrase).success, true);
  });

  it("rejects passwords under 8 characters", () => {
    assert.strictEqual(passwordSchema.safeParse("short").success, false);
    assert.strictEqual(passwordSchema.safeParse("1234567").success, false);
    assert.strictEqual(passwordSchema.safeParse("").success, false);
  });
});

describe("Registration & Login Schemas", () => {
  it("validates valid registration payload and normalizes email/username", () => {
    const validPayload = {
      name: "Alex Morgan",
      username: "Alex.Dev",
      email: "Alex.Morgan@Example.COM ",
      password: "strongpassphrase123",
      confirmPassword: "strongpassphrase123",
    };

    const parsed = registerSchema.safeParse(validPayload);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.username, "alex.dev");
      assert.strictEqual(parsed.data.email, "alex.morgan@example.com");
      assert.strictEqual(parsed.data.name, "Alex Morgan");
    }
  });

  it("rejects registration when confirm password does not match", () => {
    const payload = {
      name: "Alex Morgan",
      username: "alex",
      email: "alex@example.com",
      password: "password123",
      confirmPassword: "password999",
    };

    const parsed = registerSchema.safeParse(payload);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      assert.strictEqual(issues.some((i) => i.path.includes("confirmPassword")), true);
    }
  });

  it("normalizes login identifier (email or username)", () => {
    const emailLogin = loginSchema.safeParse({
      identifier: " Alex.Morgan@Example.Com ",
      password: "secretpassword",
    });
    assert.strictEqual(emailLogin.success, true);
    if (emailLogin.success) {
      assert.strictEqual(emailLogin.data.identifier, "alex.morgan@example.com");
    }

    const usernameLogin = loginSchema.safeParse({
      identifier: " ALEX.DEV ",
      password: "secretpassword",
    });
    assert.strictEqual(usernameLogin.success, true);
    if (usernameLogin.success) {
      assert.strictEqual(usernameLogin.data.identifier, "alex.dev");
    }
  });
});

describe("Argon2id Password Hashing Engine", () => {
  it("hashes password and verifies successfully", async () => {
    const rawPassword = "correct horse battery staple";
    const hashed = await hashPassword(rawPassword);

    assert.ok(hashed.startsWith("$argon2id$"));
    assert.strictEqual(await verifyPassword(hashed, rawPassword), true);
    assert.strictEqual(await verifyPassword(hashed, "wrong password"), false);
  });

  it("safely handles empty or corrupt password hashes without crashing", async () => {
    assert.strictEqual(await verifyPassword("", "secret"), false);
    assert.strictEqual(await verifyPassword("invalid_hash_string", "secret"), false);
  });
});

describe("Password Change Schema (Profile & Account)", () => {
  it("validates successful password change payload", () => {
    const payload = {
      currentPassword: "oldpassword123",
      newPassword: "newsecretpassphrase",
      confirmNewPassword: "newsecretpassphrase",
    };
    const parsed = changePasswordSchema.safeParse(payload);
    assert.strictEqual(parsed.success, true);
  });

  it("rejects password change when new password is identical to current password", () => {
    const payload = {
      currentPassword: "samepassword123",
      newPassword: "samepassword123",
      confirmNewPassword: "samepassword123",
    };
    const parsed = changePasswordSchema.safeParse(payload);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.issues.some((i) => i.path.includes("newPassword")));
    }
  });

  it("rejects password change when confirmation does not match", () => {
    const payload = {
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
      confirmNewPassword: "mismatchpassword",
    };
    const parsed = changePasswordSchema.safeParse(payload);
    assert.strictEqual(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.issues.some((i) => i.path.includes("confirmNewPassword")));
    }
  });
});
