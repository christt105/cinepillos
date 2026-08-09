import { execFileSync } from "node:child_process";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");

/**
 * Migrates the Postgres database pointed at by DATABASE_URL/DATABASE_URL_UNPOOLED once
 * per `vitest` run. Every test file shares that single database; `resetDatabase`
 * in factories.ts empties it before each test, so nothing leaks between files
 * even with fileParallelism disabled and no per-file database of its own.
 */
export function setup() {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
        cwd: PROJECT_ROOT,
        stdio: "pipe",
    });
}
