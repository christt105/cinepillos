import { afterAll } from "vitest";

// `@/lib/prisma` memoises the client on globalThis outside production, and the
// worker may be reused across files.
(globalThis as { prisma?: unknown }).prisma = undefined;

afterAll(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
});
