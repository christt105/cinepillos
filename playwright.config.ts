import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const DB_PATH = path.join(__dirname, ".tmp", "e2e.db");

export const E2E = {
    baseURL: `http://127.0.0.1:${PORT}`,
    user: "Christian",
    pin: "1234",
};

const env = {
    ...process.env,
    DATABASE_URL: `file:${DB_PATH}`,
    NEXTAUTH_URL: E2E.baseURL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-secret",
    PREVIEW_PIN: E2E.pin,
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
        // The database is rebuilt as part of starting the server: Playwright
        // boots the web server before any global setup would run, so doing it
        // anywhere else leaves the server holding the previous database file.
        command: [
            "mkdir -p .tmp",
            `rm -f ${DB_PATH} ${DB_PATH}-journal ${DB_PATH}-wal ${DB_PATH}-shm`,
            "npx prisma migrate deploy",
            "npx tsx prisma/seed-preview.ts",
            `npx next dev -p ${PORT} -H 127.0.0.1`,
        ].join(" && "),
        url: E2E.baseURL,
        // Never reuse: the command above recreates the database file, and an
        // already running server would keep serving the previous one.
        reuseExistingServer: false,
        timeout: 120_000,
        env,
    },
});
