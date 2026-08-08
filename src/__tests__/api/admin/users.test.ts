import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
    mockCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { create: mockCreate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { POST } from "@/app/api/admin/users/route";
import { getServerSession } from "next-auth";

const makeRequest = (body: object) =>
    new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

describe("POST /api/admin/users", () => {
    beforeEach(() => vi.clearAllMocks());

    it("creates a user when requester is admin", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "admin-1", isAdmin: true },
        } as never);

        mockCreate.mockResolvedValue({ id: "u1", name: "Ana", email: "ana@example.com" });

        const res = await POST(makeRequest({ name: "Ana", email: "ana@example.com" }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.email).toBe("ana@example.com");
        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it("returns 403 when requester is not admin", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "user-1", isAdmin: false },
        } as never);

        const res = await POST(makeRequest({ name: "Bob", email: "bob@example.com" }));

        expect(res.status).toBe(403);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makeRequest({ name: "Bob", email: "bob@example.com" }));

        expect(res.status).toBe(401);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when prisma throws (e.g. duplicate email)", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "admin-1", isAdmin: true },
        } as never);

        mockCreate.mockRejectedValue(new Error("Unique constraint failed"));

        const res = await POST(makeRequest({ name: "Ana", email: "ana@example.com" }));

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Unique constraint");
    });
});
