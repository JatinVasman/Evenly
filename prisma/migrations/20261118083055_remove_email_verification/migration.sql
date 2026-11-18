/*
  Warnings:

  - You are about to drop the `EmailVerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `emailVerifiedAt` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "EmailVerificationToken_tokenHash_idx";

-- DropIndex
DROP INDEX "EmailVerificationToken_userId_idx";

-- DropIndex
DROP INDEX "EmailVerificationToken_tokenHash_key";

-- DropIndex
DROP INDEX "PasswordResetToken_tokenHash_idx";

-- DropIndex
DROP INDEX "PasswordResetToken_userId_idx";

-- DropIndex
DROP INDEX "PasswordResetToken_tokenHash_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmailVerificationToken";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PasswordResetToken";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "image", "name", "passwordHash", "updatedAt", "username") SELECT "createdAt", "email", "id", "image", "name", "passwordHash", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_email_idx" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
