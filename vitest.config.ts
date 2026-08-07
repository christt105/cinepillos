import { defineConfig } from "vitest/config";
import path from "path";

const alias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
    resolve: { alias },
    test: {
        projects: [
            {
                resolve: { alias },
                test: {
                    name: "unit",
                    environment: "node",
                    globals: true,
                    include: ["src/**/*.test.ts"],
                },
            },
            {
                resolve: { alias },
                test: {
                    name: "integration",
                    environment: "node",
                    globals: true,
                    include: ["src/**/*.itest.ts"],
                    globalSetup: ["./src/__tests__/integration/global-setup.ts"],
                    setupFiles: ["./src/__tests__/integration/setup.ts"],
                    fileParallelism: false,
                },
            },
        ],
    },
});
