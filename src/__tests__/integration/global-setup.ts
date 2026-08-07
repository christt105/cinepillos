import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { PROJECT_ROOT, TEMPLATE_DB, TMP_DIR } from "./paths";

/**
 * Builds the template database once per `vitest` run. Each test file then gets
 * its own copy from `setup.ts`, so nothing is shared between files.
 */
export function setup() {
    rmSync(TMP_DIR, { recursive: true, force: true });
    mkdirSync(TMP_DIR, { recursive: true });

    execFileSync("npx", ["prisma", "migrate", "deploy"], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, DATABASE_URL: `file:${TEMPLATE_DB}` },
        stdio: "pipe",
    });
}

export function teardown() {
    rmSync(TMP_DIR, { recursive: true, force: true });
}
