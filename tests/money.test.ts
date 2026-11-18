import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateEqualSplit,
  validateCustomSplit,
  computeBilateralBalances,
  simplifyGroupDebts,
  getUserBalanceBreakdown,
} from "../src/lib/money";
import { parseRupeesToPaise, formatPaise } from "../src/lib/utils";

describe("Money Utilities & Integer Paise Arithmetic", () => {
  it("converts rupee strings to exact integer paise without floating point error", () => {
    assert.strictEqual(parseRupeesToPaise("150.50"), 15050);
    assert.strictEqual(parseRupeesToPaise("100"), 10000);
    assert.strictEqual(parseRupeesToPaise("0.99"), 99);
    assert.strictEqual(parseRupeesToPaise("0.01"), 1);
    assert.strictEqual(parseRupeesToPaise("900.00"), 90000);
  });

  it("formats integer paise to Indian Rupee notation", () => {
    assert.strictEqual(formatPaise(15050), "₹ 150.50");
    assert.strictEqual(formatPaise(90000), "₹ 900.00");
    assert.strictEqual(formatPaise(-30000), "- ₹ 300.00");
  });
});

describe("Equal Split Engine", () => {
  it("splits amounts cleanly without remainder (Prompt Example: ₹900 among Jatin, Rahul, Aman)", () => {
    const participants = ["usr_jatin", "usr_rahul", "usr_aman"];
    const splits = calculateEqualSplit(90000, participants);

    assert.strictEqual(splits.length, 3);
    assert.strictEqual(splits[0].amountPaise, 30000);
    assert.strictEqual(splits[1].amountPaise, 30000);
    assert.strictEqual(splits[2].amountPaise, 30000);

    const sum = splits.reduce((acc, s) => acc + s.amountPaise, 0);
    assert.strictEqual(sum, 90000);
  });

  it("allocates indivisible paise remainders consistently so total matches exactly", () => {
    // 1000 paise (₹10.00) split 3 ways: 334, 333, 333
    const participants = ["u1", "u2", "u3"];
    const splits = calculateEqualSplit(1000, participants);

    assert.strictEqual(splits[0].amountPaise, 334);
    assert.strictEqual(splits[1].amountPaise, 333);
    assert.strictEqual(splits[2].amountPaise, 333);

    const sum = splits.reduce((acc, s) => acc + s.amountPaise, 0);
    assert.strictEqual(sum, 1000);
  });
});

describe("Custom Split Engine", () => {
  it("validates exact custom allocations", () => {
    const splits = [
      { userId: "u1", amountPaise: 60050 },
      { userId: "u2", amountPaise: 95000 },
      { userId: "u3", amountPaise: 90000 },
    ];
    const validation = validateCustomSplit(245050, splits);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(validation.differencePaise, 0);
  });

  it("flags under-allocated custom splits", () => {
    const splits = [
      { userId: "u1", amountPaise: 50000 },
      { userId: "u2", amountPaise: 30000 },
    ];
    const validation = validateCustomSplit(100000, splits);
    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.differencePaise, 20000);
  });

  it("flags over-allocated custom splits", () => {
    const splits = [
      { userId: "u1", amountPaise: 60000 },
      { userId: "u2", amountPaise: 50000 },
    ];
    const validation = validateCustomSplit(100000, splits);
    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.differencePaise, -10000);
  });
});

describe("Bilateral Balance Engine & Multi-User Debts", () => {
  it("calculates correct bilateral balances matching the prompt scenario", () => {
    const currentUserId = "usr_jatin";

    // Jatin pays ₹900, split 3 ways (₹300 each)
    const expenses = [
      {
        id: "exp_1",
        totalAmountPaise: 90000,
        paidById: "usr_jatin",
        splits: [
          { userId: "usr_jatin", amountPaise: 30000 },
          { userId: "usr_rahul", amountPaise: 30000 },
          { userId: "usr_aman", amountPaise: 30000 },
        ],
      },
    ];

    const settlements: Array<{
      id: string;
      fromUserId: string;
      toUserId: string;
      amountPaise: number;
    }> = [];

    const balances = computeBilateralBalances(currentUserId, expenses, settlements);

    const rahulBal = balances.get("usr_rahul");
    const amanBal = balances.get("usr_aman");

    assert.ok(rahulBal);
    assert.strictEqual(rahulBal.netPaise, 30000); // Rahul owes Jatin ₹300
    assert.strictEqual(rahulBal.theyOwePaise, 30000);
    assert.strictEqual(rahulBal.youOwePaise, 0);

    assert.ok(amanBal);
    assert.strictEqual(amanBal.netPaise, 30000); // Aman owes Jatin ₹300
  });

  it("handles settlements reducing outstanding debts", () => {
    const currentUserId = "usr_jatin";

    const expenses = [
      {
        id: "exp_1",
        totalAmountPaise: 90000,
        paidById: "usr_jatin",
        splits: [
          { userId: "usr_jatin", amountPaise: 30000 },
          { userId: "usr_rahul", amountPaise: 30000 },
        ],
      },
    ];

    // Rahul settles ₹300 to Jatin
    const settlements = [
      {
        id: "set_1",
        fromUserId: "usr_rahul",
        toUserId: "usr_jatin",
        amountPaise: 30000,
      },
    ];

    const balances = computeBilateralBalances(currentUserId, expenses, settlements);
    const rahulBal = balances.get("usr_rahul");

    assert.ok(rahulBal);
    assert.strictEqual(rahulBal.netPaise, 0); // Completely settled up!
  });

  it("simplifies group debts to minimum transactions", () => {
    // 3 users: Jatin is +₹600, Rahul is -₹300, Aman is -₹300
    const memberBalances = [
      { userId: "usr_jatin", netPaise: 60000 },
      { userId: "usr_rahul", netPaise: -30000 },
      { userId: "usr_aman", netPaise: -30000 },
    ];

    const transactions = simplifyGroupDebts(memberBalances);
    assert.strictEqual(transactions.length, 2);

    // Sum of transactions should settle all debt
    const totalTransactions = transactions.reduce((acc, t) => acc + t.amountPaise, 0);
    assert.strictEqual(totalTransactions, 60000);
  });
});

describe("Detailed User Balance Breakdown Engine (Dashboard Card)", () => {
  const currentUserId = "usr_jatin";
  const users = [
    { id: "usr_jatin", name: "Jatin Sharma", username: "jatin" },
    { id: "usr_aman", name: "Aman Gupta", username: "aman" },
    { id: "usr_rahul", name: "Rahul Verma", username: "rahul" },
    { id: "usr_sneha", name: "Sneha Rao", username: "sneha" },
    { id: "usr_karan", name: "Karan Johar", username: "karan" },
  ];

  it("combines multiple expenses between the same two users into a single net balance", () => {
    // Prompt Example: Aman owes ₹500 from expense 1 and ₹360 from expense 2 -> Aman owes ₹860
    const expenses = [
      {
        id: "exp_1",
        totalAmountPaise: 100000, // ₹1,000 split equally
        paidById: currentUserId,
        splits: [
          { userId: currentUserId, amountPaise: 50000 },
          { userId: "usr_aman", amountPaise: 50000 }, // ₹500
        ],
      },
      {
        id: "exp_2",
        totalAmountPaise: 72000, // ₹720 split equally
        paidById: currentUserId,
        splits: [
          { userId: currentUserId, amountPaise: 36000 },
          { userId: "usr_aman", amountPaise: 36000 }, // ₹360
        ],
      },
    ];

    const breakdown = getUserBalanceBreakdown(currentUserId, expenses, [], users);

    assert.strictEqual(breakdown.owedToYou.length, 1);
    assert.strictEqual(breakdown.youOwe.length, 0);
    assert.strictEqual(breakdown.owedToYou[0].userId, "usr_aman");
    assert.strictEqual(breakdown.owedToYou[0].name, "Aman Gupta");
    assert.strictEqual(breakdown.owedToYou[0].amountPaise, 86000); // Exactly ₹860.00
    assert.strictEqual(breakdown.totalOwedToYouPaise, 86000);
    assert.strictEqual(breakdown.netBalancePaise, 86000);
  });

  it("handles partial settlements reducing outstanding debts", () => {
    // Aman owes ₹860 from 2 expenses, then partially settles ₹200
    const expenses = [
      {
        id: "exp_1",
        totalAmountPaise: 100000,
        paidById: currentUserId,
        splits: [
          { userId: currentUserId, amountPaise: 50000 },
          { userId: "usr_aman", amountPaise: 50000 },
        ],
      },
      {
        id: "exp_2",
        totalAmountPaise: 72000,
        paidById: currentUserId,
        splits: [
          { userId: currentUserId, amountPaise: 36000 },
          { userId: "usr_aman", amountPaise: 36000 },
        ],
      },
    ];

    const settlements = [
      {
        id: "set_1",
        fromUserId: "usr_aman",
        toUserId: currentUserId,
        amountPaise: 20000, // ₹200 partial payment
      },
    ];

    const breakdown = getUserBalanceBreakdown(currentUserId, expenses, settlements, users);

    assert.strictEqual(breakdown.owedToYou.length, 1);
    assert.strictEqual(breakdown.owedToYou[0].amountPaise, 66000); // ₹860 - ₹200 = ₹660
    assert.strictEqual(breakdown.totalOwedToYouPaise, 66000);
  });

  it("excludes fully settled balances completely from both sections", () => {
    // Rahul owes ₹300, and pays ₹300 in full
    const expenses = [
      {
        id: "exp_1",
        totalAmountPaise: 60000,
        paidById: currentUserId,
        splits: [
          { userId: currentUserId, amountPaise: 30000 },
          { userId: "usr_rahul", amountPaise: 30000 },
        ],
      },
    ];

    const settlements = [
      {
        id: "set_1",
        fromUserId: "usr_rahul",
        toUserId: currentUserId,
        amountPaise: 30000, // Full ₹300 payment
      },
    ];

    const breakdown = getUserBalanceBreakdown(currentUserId, expenses, settlements, users);

    assert.strictEqual(breakdown.owedToYou.length, 0);
    assert.strictEqual(breakdown.youOwe.length, 0);
    assert.strictEqual(breakdown.netBalancePaise, 0);
  });

  it("correctly categorizes multiple friends between 'Owed to you' and 'You owe' sorted descending", () => {
    const expenses = [
      // Aman owes Jatin ₹860
      {
        id: "exp_1",
        totalAmountPaise: 172000,
        paidById: currentUserId,
        splits: [
          { userId: currentUserId, amountPaise: 86000 },
          { userId: "usr_aman", amountPaise: 86000 },
        ],
      },
      // Karan owes Jatin ₹300
      {
        id: "exp_2",
        totalAmountPaise: 60000,
        paidById: currentUserId,
        splits: [
          { userId: currentUserId, amountPaise: 30000 },
          { userId: "usr_karan", amountPaise: 30000 },
        ],
      },
      // Sneha paid ₹1000 split with Jatin -> Jatin owes Sneha ₹500
      {
        id: "exp_3",
        totalAmountPaise: 100000,
        paidById: "usr_sneha",
        splits: [
          { userId: "usr_sneha", amountPaise: 50000 },
          { userId: currentUserId, amountPaise: 50000 },
        ],
      },
    ];

    const breakdown = getUserBalanceBreakdown(currentUserId, expenses, [], users);

    // Section A: Owed to you (Aman ₹860, Karan ₹300) sorted descending
    assert.strictEqual(breakdown.owedToYou.length, 2);
    assert.strictEqual(breakdown.owedToYou[0].name, "Aman Gupta");
    assert.strictEqual(breakdown.owedToYou[0].amountPaise, 86000);
    assert.strictEqual(breakdown.owedToYou[1].name, "Karan Johar");
    assert.strictEqual(breakdown.owedToYou[1].amountPaise, 30000);
    assert.strictEqual(breakdown.totalOwedToYouPaise, 116000);

    // Section B: You owe (Sneha ₹500)
    assert.strictEqual(breakdown.youOwe.length, 1);
    assert.strictEqual(breakdown.youOwe[0].name, "Sneha Rao");
    assert.strictEqual(breakdown.youOwe[0].amountPaise, 50000);
    assert.strictEqual(breakdown.totalYouOwePaise, 50000);

    // Net balance: 116000 - 50000 = 66000 (₹660 in your favor)
    assert.strictEqual(breakdown.netBalancePaise, 66000);
  });
});
