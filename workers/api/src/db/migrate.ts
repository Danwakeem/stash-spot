import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const dbId = process.env.D1_DATABASE_ID;
if (!accountId || !dbId) {
  throw new Error(
    `Missing env vars: CLOUDFLARE_ACCOUNT_ID=${accountId ?? ""}, D1_DATABASE_ID=${dbId ?? ""}`
  );
}

const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`;
const migrationsDir = join(import.meta.dirname, "migrations");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf-8");

  // Split on semicolons, trim whitespace, drop empty/comment-only fragments
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.split("\n").every((l) => l.startsWith("--") || !l));

  console.log(`Applying ${file} (${statements.length} statements)…`);

  for (const stmt of statements) {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: stmt }),
    });

    const body = await res.json();

    if (!res.ok) {
      // Ignore "table already exists" errors so the script is idempotent
      const msg = (body as { errors?: { message?: string }[] }).errors?.[0]
        ?.message;
      if (msg && /already exists/i.test(msg)) {
        console.log(`  ↳ skipped (already exists)`);
        continue;
      }
      throw new Error(`Migration failed: ${JSON.stringify(body)}\nSQL: ${stmt}`);
    }
  }
}

console.log("Migrations complete");
