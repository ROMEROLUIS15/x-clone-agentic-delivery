/**
 * Global test setup — runs once in the main vitest process before workers fork.
 * Points Prisma to a dedicated test database and applies the schema, so `npm test`
 * never touches dev.db.
 */
import { execSync } from "node:child_process";
import { existsSync, unlinkSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const TEST_DB_FILE = resolve(__dirname, "../../prisma/test.db");
const TEST_DB_URL = "file:./test.db";
const TEST_UPLOAD_DIR = resolve(__dirname, "../../uploads-test");

export async function setup() {
  process.env.DATABASE_URL = TEST_DB_URL;
  // Isolate uploads to a throwaway dir and shrink the size limit so the
  // oversize-rejection path is cheap to exercise.
  process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
  process.env.MAX_UPLOAD_BYTES = "5000";

  if (existsSync(TEST_DB_FILE)) {
    unlinkSync(TEST_DB_FILE);
  }
  if (existsSync(TEST_UPLOAD_DIR)) {
    rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
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
  if (existsSync(TEST_UPLOAD_DIR)) {
    try {
      rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
    } catch {
      // ignore — files may be locked on Windows
    }
  }
}
