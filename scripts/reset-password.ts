#!/usr/bin/env tsx
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { passwordSchema } from "../src/lib/validations/auth";

async function readHiddenInput(promptText: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const rl = readline.createInterface({ input, output });
    const ans = await rl.question(promptText);
    rl.close();
    return ans;
  }

  output.write(promptText);
  const stdin = process.stdin;
  let password = "";
  const wasRaw = stdin.isRaw;

  if (stdin.setRawMode) {
    stdin.setRawMode(true);
  }
  stdin.resume();

  return new Promise((resolve) => {
    function onData(ch: Buffer) {
      const char = ch.toString("utf8");
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.removeListener("data", onData);
        if (stdin.setRawMode) stdin.setRawMode(wasRaw || false);
        stdin.pause();
        output.write("\n");
        resolve(password);
      } else if (char === "\u0003") {
        // Handle Ctrl+C
        output.write("\n");
        process.exit(130);
      } else if (char === "\u0008" || char === "\x7f") {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          output.write("\b \b");
        }
      } else {
        password += char;
        output.write("*");
      }
    }
    stdin.on("data", onData);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Evenly — Local Password Recovery Tool for Project Owner
======================================================
Usage:
  npm run reset-password <username-or-email>

Example:
  npm run reset-password alex
  (You will be prompted to enter and confirm the new password interactively)
    `);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const identifier = args[0].trim().toLowerCase();

  // Find user
  const user = await db.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier }],
    },
  });

  if (!user) {
    console.error(`\x1b[31mError: No user found matching username or email "${identifier}"\x1b[0m`);
    process.exit(1);
  }

  console.log(`\x1b[36mFound account:\x1b[0m ${user.name} (@${user.username}) [${user.email}]`);

  let rawPassword = "";

  if (args[1]) {
    console.warn(`\x1b[33m[Security Warning] Passing passwords via CLI arguments can expose them in shell history and process listings.\x1b[0m`);
    rawPassword = args[1];
  } else {
    rawPassword = await readHiddenInput("Enter new password (min 8 chars): ");
    const confirmPassword = await readHiddenInput("Confirm new password: ");

    if (rawPassword !== confirmPassword) {
      console.error(`\x1b[31mError: Passwords do not match.\x1b[0m`);
      process.exit(1);
    }
  }

  // Validate password strength
  const passwordResult = passwordSchema.safeParse(rawPassword);
  if (!passwordResult.success) {
    console.error(`\x1b[31mError: ${passwordResult.error.issues[0]?.message}\x1b[0m`);
    process.exit(1);
  }

  // Hash new password with Argon2id
  const passwordHash = await hashPassword(rawPassword);

  // Update password in database
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // Revoke all active sessions for this user
  const revoked = await db.session.updateMany({
    where: {
      userId: user.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  console.log(`
\x1b[32m✔ Password successfully reset for user "${user.name}" (@${user.username})!\x1b[0m
- Email: ${user.email}
- Argon2id hash updated.
- Active sessions revoked: ${revoked.count}
  `);

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("\x1b[31mFatal error during password reset:\x1b[0m", e);
  await db.$disconnect();
  process.exit(1);
});
