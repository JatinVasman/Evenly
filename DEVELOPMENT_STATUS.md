# Evenly — Development Status

## Project Overview
- **Product Name**: Evenly
- **Tagline**: Split expenses evenly with friends
- **Stack**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, Prisma ORM 6.19
- **Target Currency**: Indian Rupee (INR / ₹) with exact integer paise calculations
- **Platform Focus**: Installable Android PWA with native look and feel, safe-area support, and centered bold serif header typography
- **Database Architecture**: SQLite (`file:./dev.db`) for zero-credential local development; `@prisma/adapter-libsql` for hosted Turso production deployment
- **Authentication Strategy**: Completely self-contained Email/Username + Password authentication with Argon2id hashing, database-backed sessions, in-app password changes, and CLI recovery tool for project owner. **No external email delivery (Resend/SMTP), no email verification, and no social/OAuth providers.**

---

## Complete Feature Matrix — 100% COMPLETED & VERIFIED

### 1. Self-Contained Authentication & Session System
- **Registration (`POST /api/auth/register`)**: Full name, Instagram-style username (`^[a-z0-9](?!.*\.\.)[a-z0-9._]{1,28}[a-z0-9_]$`), normalized email, and 8+ character password. Argon2id hashing with OWASP parameters. Case-insensitive database uniqueness check.
- **Login (`POST /api/auth/login`)**: Single identifier field accepting either username or email. Verifies Argon2id hash. Generic error messages prevent user enumeration. Rate limiting (5 attempts/5 mins).
- **Session Security**: 256-bit cryptographically secure random session tokens (`crypto.randomBytes(32)`). Raw token never stored in database; only SHA-256 token hashes persisted. HttpOnly, SameSite=Lax session cookies.
- **Session Revocation**: `POST /api/auth/logout` revokes current session. `POST /api/auth/change-password` verifies current password, updates Argon2id hash, and revokes all active user sessions.
- **Owner Password Recovery CLI**: `npm run reset-password` interactively prompts for identifier and new password using masked terminal input (no shell history exposure).

### 2. Friends System
- **Search Users (`GET /api/friends/search?q=`)**: Search by username or email. Returns connection status (`NONE`, `ACCEPTED`, `PENDING_INCOMING`, `PENDING_OUTGOING`) without leaking email addresses.
- **Friend Requests**:
  - `POST /api/friends/request`: Send request by username/email. Prevents self-friending and duplicate requests. Auto-accepts reciprocal pending requests.
  - `POST /api/friends/accept`: Accept incoming friend requests.
  - `POST /api/friends/reject`: Decline incoming friend requests.
  - `POST /api/friends/cancel`: Cancel outgoing friend requests.
- **Friends List (`GET /api/friends`)**: Returns all accepted friends with their bilateral net balance in paise, pending incoming requests, and pending outgoing requests.
- **Friend Details (`GET /api/friends/[id]`)**: Bilateral balance breakdown, shared expenses, shared settlements, and remove friend action (`DELETE /api/friends/[id]`).

### 3. Invitation System
- **Generate Links (`POST /api/invitations`)**: Generates 24-byte cryptographically secure random token, stores SHA-256 hash in database, returns shareable link (`/invite/[rawToken]`).
- **Share Options**: Web Share API integration, WhatsApp pre-filled message, and one-click copy to clipboard.
- **Accept Invitation Landing Page (`/invite/[token]`)**: Public mobile-optimized landing page showing inviter profile. Automatically connects users as friends (or adds to group) upon clicking Accept or after signing up.

### 4. Groups System
- **Group Creation (`POST /api/groups`)**: Create group with name, description, and selected friends. Creator assigned `ADMIN` role.
- **Group List (`GET /api/groups`)**: Shows all user groups with member count, total expenses count, and user's net group balance.
- **Group Details (`GET /api/groups/[id]`)**: Member directory with roles, total group spending, individual member net balances, expense feed, settlement ledger, and non-member 403 access control.

### 5. Expense Management & Integer Paise Engine
- **Paise Precision**: All monetary values stored and calculated in integer paise (`₹1.00 = 100 paise`), preventing floating-point rounding errors.
- **Add Expense (`POST /api/expenses`)**: Direct friend expenses or group expenses. Paid by creator or any group participant.
- **Equal Split Engine**: Splits amounts evenly with remainder paise distributed deterministically to ensure sum of splits equals total amount to the exact paisa.
- **Custom Split Engine**: Allows exact rupee/paise custom allocations with validation ensuring `allocatedPaise === totalPaise`.
- **Edit & Soft Delete (`GET / PUT / DELETE /api/expenses/[id]`)**: View details, edit title/amount/splits, or soft-delete (`deletedAt`), immediately recalculating balances.

### 6. Balance Calculation & Settle Up
- **Bilateral Balance Calculation**: Aggregates all non-deleted expenses where user is payer or participant, minus all recorded settlements.
- **Home Dashboard Green Card**:
  - Displays total net balance with color-coded badge ("You get back", "You owe", "All settled up").
  - User-wise breakdowns: **SECTION A — OWED TO YOU** (e.g., "Aman owes you — ₹860") and **SECTION B — YOU OWE** (e.g., "You owe Sneha — ₹500").
  - Clickable friend rows navigating to friend details.
  - Expand/collapse toggle for >3 entries in either section.
- **Record Settlement (`POST /api/settlements`)**: Settle up modal for recording cash, UPI, or outside payments. Supports partial or full settlement. Immediate balance recalculation.

### 7. Activity Audit Tracker
- **Activity Feed (`GET /api/activity`, `/activity`)**: Chronological audit trail logging expense creation, edits, deletions, settlements, friend connections, and group events.

### 8. Profile & Account
- **Profile Screen (`/profile`)**: Minimalist design showing user name, `@username`, email, and real statistics (groups, friends, expenses).
- **Edit Profile (`PUT /api/profile`)**: Update display name, Instagram-style username, or profile photo URL.
- **Security & Password**: In-app password change requiring current password verification and revoking all sessions.
- **Logout**: Secure session termination clearing HttpOnly cookies.

### 9. Android-First PWA Experience
- **Mobile Shell**: Centered bold serif typography (`Evenly`) matching design spec.
- **PWA Manifest & Service Worker**: `/manifest.json`, `/sw.js`, PWA registration component in `src/app/layout.tsx`. Standalone display mode with `#065F46` theme color.
- **Safe Area Insets**: Support for Android system navigation and notches (`pt-safe`, `pb-safe`).

---

## Quality & Verification Summary

| Check | Tool / Command | Result |
| :--- | :--- | :--- |
| **Unit & Integration Tests** | `npm test` (`tsx --test tests/**/*.test.ts`) | **81 passing** across 17 test suites (0 failures) |
| **TypeScript Type Checking** | `npx tsc --noEmit` | **0 errors** |
| **Linting & Code Style** | `npm run lint` (`eslint`) | **0 errors, 0 warnings** |
| **Production Build** | `npm run build` (`next build`) | **32 routes compiled & optimized cleanly** |
| **E2E Multi-User Scenario** | `tests/e2e-workflow.test.ts` (Section 19: Jatin, Aman, Rahul) | **10 / 10 subtests passing** |
