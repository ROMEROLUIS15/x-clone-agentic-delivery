/**
 * Global test setup — runs once in the main vitest process before workers fork.
 * Points Prisma to a dedicated test database and applies the schema, so `npm test`
 * never touches dev.db.
 */
import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const TEST_DB_FILE = resolve(__dirname, "../../prisma/test.db");
const TEST_DB_URL = "file:./test.db";

export async function setup() {
  process.env.DATABASE_URL = TEST_DB_URL;

  if (existsSync(TEST_DB_FILE)) {
    unlinkSync(TEST_DB_FILE);
  }

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "ignore",
    cwd: resolve(__dirname, "../.."),
  });
}

export async function teardown() {
  if (existsSync(TEST_DB_FILE)) {
    try {
      unlinkSync(TEST_DB_FILE);
    } catch {
      // ignore — file may be locked on Windows
    }
  }
}
