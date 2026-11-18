import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

describe("Database & Prisma Schema Integration (SQLite / libSQL)", () => {
  const testRunId = Date.now().toString(36);
  const testUserEmail1 = `dbtest1_${testRunId}@example.com`;
  const testUsername1 = `dbtest1_${testRunId}`;
  const testUserEmail2 = `dbtest2_${testRunId}@example.com`;
  const testUsername2 = `dbtest2_${testRunId}`;

  let user1Id: string;
  let user2Id: string;
  let groupId: string;

  before(async () => {
    // Ensure database connection is active
    await db.$connect();
  });

  after(async () => {
    // Clean up created test data in topological foreign-key order
    const userIds = [user1Id, user2Id].filter(Boolean);
    if (userIds.length > 0) {
      await db.activityLog.deleteMany({ where: { actorId: { in: userIds } } });
      await db.settlement.deleteMany({
        where: { OR: [{ payerId: { in: userIds } }, { payeeId: { in: userIds } }] },
      });
      await db.expenseSplit.deleteMany({ where: { userId: { in: userIds } } });
      await db.expense.deleteMany({ where: { payerId: { in: userIds } } });
      await db.groupMember.deleteMany({ where: { userId: { in: userIds } } });
      await db.group.deleteMany({ where: { createdById: { in: userIds } } });
      await db.session.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await db.$disconnect();
  });

  it("can insert a user with Argon2id password and query it", async () => {
    const passwordHash = await hashPassword("supersecretpassphrase123");

    const user1 = await db.user.create({
      data: {
        email: testUserEmail1,
        username: testUsername1,
        name: "Test User 1",
        passwordHash,
      },
    });

    assert.ok(user1.id);
    assert.strictEqual(user1.email, testUserEmail1);
    assert.strictEqual(user1.username, testUsername1);
    assert.strictEqual(user1.name, "Test User 1");
    user1Id = user1.id;
  });

  it("enforces unique constraint on email at database level", async () => {
    const passwordHash = await hashPassword("supersecretpassphrase123");

    await assert.rejects(
      async () => {
        await db.user.create({
          data: {
            email: testUserEmail1, // Duplicate email
            username: `unique_${testRunId}`,
            name: "Duplicate Email User",
            passwordHash,
          },
        });
      },
      (err: unknown) => {
        assert.ok(err && typeof err === "object" && "code" in err && err.code === "P2002");
        return true;
      }
    );
  });

  it("enforces unique constraint on username at database level", async () => {
    const passwordHash = await hashPassword("supersecretpassphrase123");

    await assert.rejects(
      async () => {
        await db.user.create({
          data: {
            email: `unique_email_${testRunId}@example.com`,
            username: testUsername1, // Duplicate username
            name: "Duplicate Username User",
            passwordHash,
          },
        });
      },
      (err: unknown) => {
        assert.ok(err && typeof err === "object" && "code" in err && err.code === "P2002");
        return true;
      }
    );
  });

  it("creates related user, group, and group memberships", async () => {
    const passwordHash = await hashPassword("supersecretpassphrase123");

    const user2 = await db.user.create({
      data: {
        email: testUserEmail2,
        username: testUsername2,
        name: "Test User 2",
        passwordHash,
      },
    });
    user2Id = user2.id;

    // Create group
    const group = await db.group.create({
      data: {
        name: "Goa Trip 2026",
        description: "Weekend trip expenses",
        createdById: user1Id,
        members: {
          create: [
            { userId: user1Id, role: "ADMIN" },
            { userId: user2Id, role: "MEMBER" },
          ],
        },
      },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    assert.ok(group.id);
    assert.strictEqual(group.members.length, 2);
    groupId = group.id;
  });

  it("stores monetary amounts as exact integer paise in Expense and ExpenseSplit", async () => {
    // ₹900.50 expense -> 90050 paise
    // Split equally: user1 = 45025 paise, user2 = 45025 paise
    const totalAmountPaise = 90050;
    const splitAmountPaise = 45025;

    const expense = await db.expense.create({
      data: {
        description: "Beach Shack Dinner",
        amountPaise: totalAmountPaise,
        date: new Date(),
        payerId: user1Id,
        groupId,
        splitType: "EQUAL",
        splits: {
          create: [
            { userId: user1Id, amountPaise: splitAmountPaise },
            { userId: user2Id, amountPaise: splitAmountPaise },
          ],
        },
      },
      include: {
        splits: true,
      },
    });

    assert.ok(expense.id);
    assert.strictEqual(expense.amountPaise, 90050);
    assert.strictEqual(expense.splits.length, 2);
    assert.strictEqual(expense.splits[0].amountPaise, 45025);
    assert.strictEqual(expense.splits[1].amountPaise, 45025);
  });

  it("records settlement and activity log entries", async () => {
    // User 2 settles 45025 paise to User 1
    const settlement = await db.settlement.create({
      data: {
        payerId: user2Id,
        payeeId: user1Id,
        amountPaise: 45025,
        date: new Date(),
        groupId,
        notes: "UPI payment for beach shack dinner",
      },
    });

    assert.ok(settlement.id);
    assert.strictEqual(settlement.amountPaise, 45025);

    // Record activity log
    const activity = await db.activityLog.create({
      data: {
        actorId: user2Id,
        actionType: "SETTLEMENT_RECORDED",
        entityType: "SETTLEMENT",
        entityId: settlement.id,
        metadata: JSON.stringify({ amountPaise: 45025, toUser: user1Id }),
      },
    });

    assert.ok(activity.id);
    assert.strictEqual(activity.actionType, "SETTLEMENT_RECORDED");
  });

  it("creates and manages database-backed sessions with revocation", async () => {
    const sessionTokenHash = `hash_session_${testRunId}`;
    const session = await db.session.create({
      data: {
        tokenHash: sessionTokenHash,
        userId: user1Id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: "Android Mobile / Chrome",
        ipAddress: "127.0.0.1",
      },
    });

    assert.ok(session.id);
    assert.strictEqual(session.userId, user1Id);
    assert.strictEqual(session.revokedAt, null);

    // Test session revocation on password change
    await db.session.updateMany({
      where: { userId: user1Id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const updatedSession = await db.session.findUnique({
      where: { id: session.id },
    });
    assert.ok(updatedSession?.revokedAt);
  });
});
