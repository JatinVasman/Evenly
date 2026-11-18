import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Creates a PrismaClient instance.
 * - If TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are provided: connects to hosted Turso (libSQL) via driver adapter.
 * - In local development without Turso: connects directly to SQLite via DATABASE_URL="file:./dev.db".
 * - In production (Vercel): STRICTLY blocks fallback to ephemeral local SQLite.
 */
function createPrismaClient(): PrismaClient {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN?.trim();

  // In production (Vercel): STRICTLY enforce Turso credentials
  if (isProduction) {
    if (!tursoUrl || !tursoAuthToken) {
      console.error(
        "❌ FATAL: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing in production environment!"
      );
      throw new Error(
        "Production database configuration missing: Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel Project Settings."
      );
    }
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
    return new PrismaClient({ adapter });
  }

  // Explicit local testing against remote Turso
  if (process.env.USE_TURSO === "true" && tursoUrl && tursoAuthToken) {
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
    return new PrismaClient({ adapter });
  }

  // Local development SQLite fallback
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

let prismaInstance: PrismaClient | undefined = globalForPrisma.prisma;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prismaInstance;
    }
  }
  return prismaInstance;
}

// Proxy wrapper ensures PrismaClient is lazily instantiated on the first database call,
// preventing serverless runtime import-time crashes.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (client as any)[prop];
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});

export default db;
