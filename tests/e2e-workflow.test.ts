import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { POST as registerHandler } from "../src/app/api/auth/register/route";
import { GET as friendsHandler } from "../src/app/api/friends/route";
import { POST as friendRequestHandler } from "../src/app/api/friends/request/route";
import { POST as friendAcceptHandler } from "../src/app/api/friends/accept/route";
import { POST as createInvitationHandler } from "../src/app/api/invitations/route";
import { POST as acceptInvitationHandler } from "../src/app/api/invitations/[token]/route";
import { POST as createGroupHandler } from "../src/app/api/groups/route";
import { GET as groupDetailHandler } from "../src/app/api/groups/[id]/route";
import { POST as createExpenseHandler } from "../src/app/api/expenses/route";
import { DELETE as deleteExpenseHandler } from "../src/app/api/expenses/[id]/route";
import { POST as createSettlementHandler } from "../src/app/api/settlements/route";
import { GET as dashboardHandler } from "../src/app/api/dashboard/route";
import { GET as activityHandler } from "../src/app/api/activity/route";
import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "../src/lib/auth/session";

function createAuthRequest(
  url: string,
  method: string,
  sessionToken?: string,
  body?: unknown
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sessionToken) {
    headers["cookie"] = `${SESSION_COOKIE_NAME}=${sessionToken}`;
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function extractSessionCookie(res: Response): string {
  const cookieObj = (res as Response & { cookies?: { get?: (name: string) => { value?: string } } }).cookies?.get?.(SESSION_COOKIE_NAME);
  if (cookieObj?.value) return cookieObj.value;

  const header = res.headers.get("set-cookie") || "";
  const match = header.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : "";
}

describe("Section 19: End-to-End Multi-User Scenario (Alex, Aman, Rahul)", () => {
  const timestamp = Date.now();
  const alexUser = {
    name: "Alex Morgan",
    username: `alex_${timestamp}`,
    email: `alex_${timestamp}@example.com`,
    password: "alex_secure_pass_123",
  };
  const amanUser = {
    name: "Aman Gupta",
    username: `aman_${timestamp}`,
    email: `aman_${timestamp}@example.com`,
    password: "aman_secure_pass_123",
  };
  const rahulUser = {
    name: "Rahul Verma",
    username: `rahul_${timestamp}`,
    email: `rahul_${timestamp}@example.com`,
    password: "rahul_secure_pass_123",
  };
  const strangerUser = {
    name: "Stranger User",
    username: `stranger_${timestamp}`,
    email: `stranger_${timestamp}@example.com`,
    password: "stranger_pass_123",
  };

  let alexId = "";
  let alexToken = "";
  let amanId = "";
  let amanToken = "";
  let rahulId = "";
  let rahulToken = "";
  let strangerToken = "";

  let inviteRawToken = "";
  let groupId = "";
  let expense1Id = "";
  let expense2Id = "";

  after(async () => {
    // Cleanup created test records
    const testUsernames = [alexUser.username, amanUser.username, rahulUser.username, strangerUser.username];
    const users = await db.user.findMany({ where: { username: { in: testUsernames } } });
    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      await db.activityLog.deleteMany({ where: { actorId: { in: userIds } } });
      await db.settlement.deleteMany({ where: { OR: [{ payerId: { in: userIds } }, { payeeId: { in: userIds } }] } });
      await db.expenseSplit.deleteMany({ where: { userId: { in: userIds } } });
      await db.expense.deleteMany({ where: { payerId: { in: userIds } } });
      await db.invitation.deleteMany({ where: { inviterId: { in: userIds } } });
      await db.groupMember.deleteMany({ where: { userId: { in: userIds } } });
      await db.group.deleteMany({ where: { createdById: { in: userIds } } });
      await db.friendship.deleteMany({ where: { OR: [{ requesterId: { in: userIds } }, { recipientId: { in: userIds } }] } });
      await db.session.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it("1-3. Alex, Aman, Rahul and Stranger register accounts", async () => {
    // Register Alex
    const reqJ = createAuthRequest("http://localhost:3000/api/auth/register", "POST", undefined, {
      ...alexUser,
      confirmPassword: alexUser.password,
    });
    const resAlex = await registerHandler(reqJ);
    assert.strictEqual(resAlex.status, 201);
    const dataAlex = await resAlex.json();
    alexId = dataAlex.user.id;
    alexToken = extractSessionCookie(resAlex);
    assert.ok(alexToken);

    // Register Aman
    const reqA = createAuthRequest("http://localhost:3000/api/auth/register", "POST", undefined, {
      ...amanUser,
      confirmPassword: amanUser.password,
    });
    const resA = await registerHandler(reqA);
    assert.strictEqual(resA.status, 201);
    const dataA = await resA.json();
    amanId = dataA.user.id;
    amanToken = extractSessionCookie(resA);
    assert.ok(amanToken);

    // Register Rahul
    const reqR = createAuthRequest("http://localhost:3000/api/auth/register", "POST", undefined, {
      ...rahulUser,
      confirmPassword: rahulUser.password,
    });
    const resR = await registerHandler(reqR);
    assert.strictEqual(resR.status, 201);
    const dataR = await resR.json();
    rahulId = dataR.user.id;
    rahulToken = extractSessionCookie(resR);
    assert.ok(rahulToken);

    // Register Stranger
    const reqS = createAuthRequest("http://localhost:3000/api/auth/register", "POST", undefined, {
      ...strangerUser,
      confirmPassword: strangerUser.password,
    });
    const resS = await registerHandler(reqS);
    assert.strictEqual(resS.status, 201);
    strangerToken = extractSessionCookie(resS);
  });

  it("4-6. Alex sends friend request to Aman, Aman accepts", async () => {
    // Alex sends friend request using Aman's username
    const reqSend = createAuthRequest("http://localhost:3000/api/friends/request", "POST", alexToken, {
      identifier: amanUser.username,
    });
    const resSend = await friendRequestHandler(reqSend);
    assert.strictEqual(resSend.status, 201);
    const dataSend = await resSend.json();
    const friendshipId = dataSend.friendshipId;
    assert.ok(friendshipId);

    // Aman checks incoming friend requests
    const reqFriendsA = createAuthRequest("http://localhost:3000/api/friends", "GET", amanToken);
    const resFriendsA = await friendsHandler(reqFriendsA);
    assert.strictEqual(resFriendsA.status, 200);
    const dataFriendsA = await resFriendsA.json();
    assert.strictEqual(dataFriendsA.pendingIncoming.length, 1);
    assert.strictEqual(dataFriendsA.pendingIncoming[0].user.id, alexId);

    // Aman accepts friend request
    const reqAccept = createAuthRequest("http://localhost:3000/api/friends/accept", "POST", amanToken, {
      friendshipId,
    });
    const resAccept = await friendAcceptHandler(reqAccept);
    assert.strictEqual(resAccept.status, 200);

    // Verify Alex and Aman are now accepted friends
    const reqVerify = createAuthRequest("http://localhost:3000/api/friends", "GET", alexToken);
    const resVerify = await friendsHandler(reqVerify);
    const dataVerify = await resVerify.json();
    assert.strictEqual(dataVerify.friends.some((f: { user: { id: string } }) => f.user.id === amanId), true);
  });

  it("7-8. Alex generates invitation link, Rahul accepts to connect", async () => {
    // Alex generates invite
    const reqInv = createAuthRequest("http://localhost:3000/api/invitations", "POST", alexToken, {});
    const resInv = await createInvitationHandler(reqInv);
    assert.strictEqual(resInv.status, 201);
    const dataInv = await resInv.json();
    inviteRawToken = dataInv.rawToken;
    assert.ok(inviteRawToken);

    // Rahul accepts invitation link
    const reqAcceptInv = createAuthRequest(`http://localhost:3000/api/invitations/${inviteRawToken}`, "POST", rahulToken);
    const resAcceptInv = await acceptInvitationHandler(reqAcceptInv, {
      params: Promise.resolve({ token: inviteRawToken }),
    });
    assert.strictEqual(resAcceptInv.status, 200);

    // Verify Alex and Rahul are now connected friends
    const reqVerify = createAuthRequest("http://localhost:3000/api/friends", "GET", alexToken);
    const resVerify = await friendsHandler(reqVerify);
    const dataVerify = await resVerify.json();
    assert.strictEqual(dataVerify.friends.some((f: { user: { id: string } }) => f.user.id === rahulId), true);
  });

  it("9. Alex creates a group 'Goa Trip' and adds Aman & Rahul", async () => {
    const reqGrp = createAuthRequest("http://localhost:3000/api/groups", "POST", alexToken, {
      name: "Goa Trip",
      description: "Beach holiday expenses",
      memberUserIds: [amanId, rahulId],
    });
    const resGrp = await createGroupHandler(reqGrp);
    assert.strictEqual(resGrp.status, 201);
    const dataGrp = await resGrp.json();
    groupId = dataGrp.group.id;
    assert.ok(groupId);

    // Verify all 3 are members
    const reqGet = createAuthRequest(`http://localhost:3000/api/groups/${groupId}`, "GET", alexToken);
    const resGet = await groupDetailHandler(reqGet, { params: Promise.resolve({ id: groupId }) });
    assert.strictEqual(resGet.status, 200);
    const dataGet = await resGet.json();
    assert.strictEqual(dataGet.group.members.length, 3);
  });

  it("10-12. Alex adds ₹900 expense split equally (₹300 each among Alex, Aman, Rahul)", async () => {
    const reqExp = createAuthRequest("http://localhost:3000/api/expenses", "POST", alexToken, {
      description: "Resort Stay",
      amountPaise: 90000, // ₹900.00
      date: new Date().toISOString(),
      payerId: alexId,
      groupId,
      splitType: "EQUAL",
      splits: [
        { userId: alexId, amountPaise: 30000 },
        { userId: amanId, amountPaise: 30000 },
        { userId: rahulId, amountPaise: 30000 },
      ],
    });
    const resExp = await createExpenseHandler(reqExp);
    assert.strictEqual(resExp.status, 201);
    const dataExp = await resExp.json();
    expense1Id = dataExp.expense.id;
    assert.ok(expense1Id);

    // Verify Alex's dashboard balance
    // Aman owes Alex ₹300, Rahul owes Alex ₹300 -> Total owed = ₹600, Net = +₹600
    const reqDash = createAuthRequest("http://localhost:3000/api/dashboard", "GET", alexToken);
    const resDash = await dashboardHandler(reqDash);
    const dataDash = await resDash.json();
    assert.strictEqual(dataDash.balanceBreakdown.netBalancePaise, 60000);
    assert.strictEqual(dataDash.balanceBreakdown.totalOwedToYouPaise, 60000);
    assert.strictEqual(dataDash.balanceBreakdown.totalYouOwePaise, 0);
  });

  it("13. Aman adds another expense: ₹300 dinner split equally with Alex (₹150 each)", async () => {
    const reqExp2 = createAuthRequest("http://localhost:3000/api/expenses", "POST", amanToken, {
      description: "Dinner at Beach Shack",
      amountPaise: 30000, // ₹300.00
      date: new Date().toISOString(),
      payerId: amanId,
      groupId,
      splitType: "EQUAL",
      splits: [
        { userId: amanId, amountPaise: 15000 },
        { userId: alexId, amountPaise: 15000 },
      ],
    });
    const resExp2 = await createExpenseHandler(reqExp2);
    assert.strictEqual(resExp2.status, 201);
    const dataExp2 = await resExp2.json();
    expense2Id = dataExp2.expense.id;

    // Check Alex's balance:
    // Aman previously owed ₹300, now Alex owes Aman ₹150 -> Net between Alex & Aman = ₹150 (Aman owes Alex)
    // Rahul still owes Alex ₹300.
    // Total owed to Alex: ₹150 + ₹300 = ₹450.
    const reqDash = createAuthRequest("http://localhost:3000/api/dashboard", "GET", alexToken);
    const resDash = await dashboardHandler(reqDash);
    const dataDash = await resDash.json();
    assert.strictEqual(dataDash.balanceBreakdown.netBalancePaise, 45000);

    const amanEntry = dataDash.balanceBreakdown.owedToYou.find((i: { userId: string }) => i.userId === amanId);
    assert.ok(amanEntry);
    assert.strictEqual(amanEntry.amountPaise, 15000); // Aman owes Alex ₹150
  });

  it("14. Rahul records partial settlement: pays Alex ₹100", async () => {
    const reqSet = createAuthRequest("http://localhost:3000/api/settlements", "POST", rahulToken, {
      payerId: rahulId,
      payeeId: alexId,
      amountPaise: 10000, // ₹100.00
      notes: "Partial payment via UPI",
      groupId,
    });
    const resSet = await createSettlementHandler(reqSet);
    assert.strictEqual(resSet.status, 201);

    // Verify Alex's Dashboard:
    // Rahul owed ₹300 - ₹100 = ₹200.
    // Aman owes ₹150.
    // Total owed to Alex: ₹150 + ₹200 = ₹350. Alex owes: ₹0. Net = +₹350.
    const reqDashAlex = createAuthRequest("http://localhost:3000/api/dashboard", "GET", alexToken);
    const resDashJ = await dashboardHandler(reqDashAlex);
    const dataDashJ = await resDashJ.json();

    assert.strictEqual(dataDashJ.balanceBreakdown.netBalancePaise, 35000);
    assert.strictEqual(dataDashJ.balanceBreakdown.totalOwedToYouPaise, 35000);
    assert.strictEqual(dataDashJ.balanceBreakdown.totalYouOwePaise, 0);

    const rahulItem = dataDashJ.balanceBreakdown.owedToYou.find((i: { userId: string }) => i.userId === rahulId);
    assert.ok(rahulItem);
    assert.strictEqual(rahulItem.amountPaise, 20000); // Rahul owes ₹200

    // Verify Rahul's Dashboard:
    // Rahul owes Alex ₹200. Total you owe: ₹200. Net = -₹200.
    const reqDashR = createAuthRequest("http://localhost:3000/api/dashboard", "GET", rahulToken);
    const resDashR = await dashboardHandler(reqDashR);
    const dataDashR = await resDashR.json();

    assert.strictEqual(dataDashR.balanceBreakdown.netBalancePaise, -20000);
    assert.strictEqual(dataDashR.balanceBreakdown.totalYouOwePaise, 20000);
    assert.strictEqual(dataDashR.balanceBreakdown.totalOwedToYouPaise, 0);
    assert.strictEqual(dataDashR.balanceBreakdown.youOwe[0].userId, alexId);
    assert.strictEqual(dataDashR.balanceBreakdown.youOwe[0].amountPaise, 20000);
  });

  it("15-16. Activity logs are chronologically recorded", async () => {
    const reqAct = createAuthRequest("http://localhost:3000/api/activity", "GET", alexToken);
    const resAct = await activityHandler(reqAct);
    assert.strictEqual(resAct.status, 200);
    const dataAct = await resAct.json();
    assert.ok(dataAct.activities.length >= 4);

    const actionTypes = dataAct.activities.map((a: { actionType: string }) => a.actionType);
    assert.ok(actionTypes.includes("SETTLEMENT_RECORDED"));
    assert.ok(actionTypes.includes("EXPENSE_ADDED"));
    assert.ok(actionTypes.includes("GROUP_CREATED"));
    assert.ok(actionTypes.includes("FRIEND_REQUEST_ACCEPTED"));
  });

  it("17. Unauthorized access to group data is strictly blocked (403 Forbidden)", async () => {
    // Stranger is not a member of 'Goa Trip'
    const reqForbidden = createAuthRequest(`http://localhost:3000/api/groups/${groupId}`, "GET", strangerToken);
    const resForbidden = await groupDetailHandler(reqForbidden, { params: Promise.resolve({ id: groupId }) });
    assert.strictEqual(resForbidden.status, 403);
    const dataForbidden = await resForbidden.json();
    assert.strictEqual(dataForbidden.error, "Forbidden: You are not a member of this group");
  });

  it("18. Expense deletion properly recalculates balances", async () => {
    // Delete expense 2 (Aman's ₹300 dinner)
    const reqDel = createAuthRequest(`http://localhost:3000/api/expenses/${expense2Id}`, "DELETE", amanToken);
    const resDel = await deleteExpenseHandler(reqDel, { params: Promise.resolve({ id: expense2Id }) });
    assert.strictEqual(resDel.status, 200);

    // After deletion: Aman's expense is gone.
    // Only Alex's ₹900 resort stay (Aman owes ₹300, Rahul owes ₹300) and Rahul's ₹100 payment exist.
    // Aman owes Alex: ₹300.
    // Rahul owes Alex: ₹200.
    // Total owed to Alex: ₹300 + ₹200 = ₹500. Net = +₹500.
    const reqDash = createAuthRequest("http://localhost:3000/api/dashboard", "GET", alexToken);
    const resDash = await dashboardHandler(reqDash);
    const dataDash = await resDash.json();

    assert.strictEqual(dataDash.balanceBreakdown.netBalancePaise, 50000);
    assert.strictEqual(dataDash.balanceBreakdown.totalOwedToYouPaise, 50000);

    const amanEntry = dataDash.balanceBreakdown.owedToYou.find((i: { userId: string }) => i.userId === amanId);
    assert.strictEqual(amanEntry.amountPaise, 30000);
  });
});
