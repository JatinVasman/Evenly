import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Creates a PrismaClient instance.
 * - In local development: connects directly to SQLite via DATABASE_URL="file:./dev.db".
 *   (Can be overridden for remote testing with USE_TURSO=true)
 * - In production (Vercel): connects to hosted Turso (libSQL) using the driver adapter.
 *   STRICT REQUIREMENT: Production strictly blocks fallback to ephemeral local SQLite.
 */
function createPrismaClient(): PrismaClient {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  // Production environment: STRICTLY enforce Turso credentials
  if (isProduction) {
    if (!tursoUrl || !tursoAuthToken) {
      throw new Error(
        "CRITICAL DATABASE CONFIGURATION ERROR: Production environment detected (Vercel/production), " +
          "but TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing. " +
          "Fallback to an ephemeral local SQLite file on Vercel is strictly blocked to prevent data loss. " +
          "Please configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your Vercel Project Settings."
      );
    }

    // Dynamic runtime require prevents Next.js/Turbopack from statically analyzing @libsql non-JS files
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = (globalThis as any).__non_webpack_require__ ?? eval("require");
    const { PrismaLibSQL } = req("@prisma/adapter-libsql");
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
    return new PrismaClient({ adapter });
  }

  // Explicit local testing against remote Turso
  if (process.env.USE_TURSO === "true" && tursoUrl && tursoAuthToken) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = (globalThis as any).__non_webpack_require__ ?? eval("require");
    const { PrismaLibSQL } = req("@prisma/adapter-libsql");
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
    return new PrismaClient({ adapter });
  }

  // Default for local development: SQLite (file:./dev.db)
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
