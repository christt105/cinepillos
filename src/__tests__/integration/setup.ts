import { copyFileSync, rmSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll } from "vitest";
import { TEMPLATE_DB, TMP_DIR, sidecarFiles } from "./paths";

const dbPath = path.join(TMP_DIR, `test-${randomUUID()}.db`);

copyFileSync(TEMPLATE_DB, dbPath);

process.env.DATABASE_URL = `file:${dbPath}`;

// `@/lib/prisma` memoises the client on globalThis outside production, and the
// worker may be reused across files with a different DATABASE_URL.
(globalThis as { prisma?: unknown }).prisma = undefined;

afterAll(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();

    for (const file of [dbPath, ...sidecarFiles(dbPath)]) {
        rmSync(file, { force: true });
    }
});
