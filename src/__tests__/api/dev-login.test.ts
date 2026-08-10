import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { mockUserFindMany, mockUserFindUnique, mockEncode } = vi.hoisted(() => ({
    mockUserFindMany: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockEncode: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: { user: { findMany: mockUserFindMany, findUnique: mockUserFindUnique } },
}));

vi.mock("next-auth/jwt", () => ({
    encode: mockEncode,
}));

import { GET, POST } from "@/app/api/dev-login/route";

const makeRequest = (body: object, url = "http://localhost/api/dev-login") =>
    new NextRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

describe("/api/dev-login", () => {
    const originalVercelEnv = process.env.VERCEL_ENV;

    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.VERCEL_ENV;
    });

    afterEach(() => {
        process.env.VERCEL_ENV = originalVercelEnv;
    });

    describe("GET", () => {
        it("lists users outside production", async () => {
            mockUserFindMany.mockResolvedValue([
                { id: "u1", name: "User 1", email: "u1@test", image: null },
            ]);

            const res = await GET();

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({
                users: [{ id: "u1", name: "User 1", email: "u1@test", image: null }],
            });
        });

        it("404s in production", async () => {
            process.env.VERCEL_ENV = "production";

            const res = await GET();

            expect(res.status).toBe(404);
            expect(mockUserFindMany).not.toHaveBeenCalled();
        });
    });

    describe("POST", () => {
        it("sets a session cookie for a known user", async () => {
            mockUserFindUnique.mockResolvedValue({ id: "u1", name: "User 1", email: "u1@test" });
            mockEncode.mockResolvedValue("signed-jwt");

            const res = await POST(makeRequest({ userId: "u1" }));

            expect(res.status).toBe(200);
            expect(mockEncode).toHaveBeenCalledWith(
                expect.objectContaining({ token: { id: "u1", name: "User 1", email: "u1@test" } })
            );
            expect(res.cookies.get("next-auth.session-token")?.value).toBe("signed-jwt");
        });

        it("uses the __Secure- cookie name over https", async () => {
            mockUserFindUnique.mockResolvedValue({ id: "u1", name: "User 1", email: "u1@test" });
            mockEncode.mockResolvedValue("signed-jwt");

            const res = await POST(
                makeRequest({ userId: "u1" }, "https://preview.vercel.app/api/dev-login")
            );

            expect(res.cookies.get("__Secure-next-auth.session-token")?.value).toBe("signed-jwt");
        });

        it("returns 404 for an unknown user", async () => {
            mockUserFindUnique.mockResolvedValue(null);

            const res = await POST(makeRequest({ userId: "ghost" }));

            expect(res.status).toBe(404);
            expect(mockEncode).not.toHaveBeenCalled();
        });

        it("returns 400 when userId is missing", async () => {
            const res = await POST(makeRequest({}));

            expect(res.status).toBe(400);
            expect(mockUserFindUnique).not.toHaveBeenCalled();
        });

        it("404s in production", async () => {
            process.env.VERCEL_ENV = "production";

            const res = await POST(makeRequest({ userId: "u1" }));

            expect(res.status).toBe(404);
            expect(mockUserFindUnique).not.toHaveBeenCalled();
        });
    });
});
