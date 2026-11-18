import { createClient } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

// Manually parse .env if present
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url || !authToken) {
    console.error("❌ Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in your environment or .env file.");
    process.exit(1);
  }

  console.log(`Connecting to Turso database: ${url}...`);
  const client = createClient({ url, authToken });

  // Check existing tables
  const existingTablesRes = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  const existingTables = existingTablesRes.rows.map((r) => r.name as string);

  if (existingTables.length > 0) {
    console.log(`⚠️  Warning: The remote Turso database already contains tables: ${existingTables.join(", ")}`);
    console.log("To prevent accidental data loss, schema application was halted.");
    process.exit(1);
  }

  const sqlPath = path.resolve(process.cwd(), "prisma", "turso-schema.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Error: SQL schema file not found at ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, "utf-8");

  // Confirm before applying
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(`Apply Evenly production schema to ${url}? (yes/no): `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });

  if (answer !== "yes" && answer !== "y") {
    console.log("Operation cancelled by user. No changes were made.");
    process.exit(0);
  }

  console.log("Applying schema to Turso...");
  await client.executeMultiple(sqlContent);

  // Verify created tables
  const verifyRes = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  const createdTables = verifyRes.rows.map((r) => r.name as string);

  console.log("✅ Successfully created tables in Turso:");
  createdTables.forEach((t) => console.log(`   - ${t}`));
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
