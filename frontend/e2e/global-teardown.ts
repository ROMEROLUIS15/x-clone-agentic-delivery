import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Deletes the throwaway E2E database so no test data is left behind. */
const here = dirname(fileURLToPath(import.meta.url));
const E2E_DB = resolve(here, "../../backend/e2e.db");

export default function globalTeardown() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = E2E_DB + suffix;
    if (existsSync(file)) {
      try {
        rmSync(file, { force: true });
      } catch {
        // may be locked on Windows; harmless leftover, ignored on next run
      }
    }
  }
}
