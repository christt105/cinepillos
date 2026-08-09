import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

// A local Postgres is expected to be reachable the same way it is for
// `npm run test:integration` (see README's Tests section). Set both to the
// same env process-wide so the webServer subprocess and the spec files
// (which query the seeded data through `@/lib/prisma`) agree on where the
// database is.
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/cinepillos_e2e";
process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL;
process.env.NEXTAUTH_SECRET ??= "e2e-secret";

export const E2E = {
    baseURL: `http://127.0.0.1:${PORT}`,
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
    christian: "christian@preview.local",
};

const env = {
    ...process.env,
    NEXTAUTH_URL: E2E.baseURL,
};

export default defineConfig({
    testDir: "./e2e",
    // One worker: every test shares the same seeded database.
    fullyParallel: false,
    workers: 1,
    reporter: process.env.CI ? "line" : "list",
    use: {
        baseURL: E2E.baseURL,
        trace: "retain-on-failure",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        // Chromium in a 375px-wide phone viewport: narrower than the Pixel 5
        // preset and the width the home page used to clip at.
        { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } } },
    ],
    webServer: {
        // The database is reset as part of starting the server: Playwright
        // boots the web server before any global setup would run, so doing it
        // anywhere else leaves the server holding stale data.
        command: [
            "npx prisma migrate deploy",
            "npx tsx prisma/seed-preview.ts",
            `npx next dev -p ${PORT} -H 127.0.0.1`,
        ].join(" && "),
        url: E2E.baseURL,
        // Never reuse: the command above reseeds the database, and an already
        // running server would keep serving the previous data.
        reuseExistingServer: false,
        timeout: 120_000,
        env,
    },
});
