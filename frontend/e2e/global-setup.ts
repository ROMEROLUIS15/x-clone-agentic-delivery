import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Provisions a throwaway SQLite database for the E2E run so the dev database is
 * never touched. Playwright starts the backend with DATABASE_URL=file:./e2e.db
 * (see playwright.config.ts); here we create it fresh and apply migrations.
 */
const here = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(here, "../../backend");
const E2E_DB = resolve(backendDir, "e2e.db");

function removeDbFiles() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = E2E_DB + suffix;
    if (existsSync(file)) {
      try {
        rmSync(file, { force: true });
      } catch {
        // may be locked on Windows; the run will reuse it
      }
    }
  }
}

export default function globalSetup() {
  removeDbFiles();
  execSync("npx prisma migrate deploy", {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: "file:./e2e.db" },
    stdio: "inherit",
  });
}
