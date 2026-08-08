import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate } = vi.hoisted(() => ({
    mockUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { update: mockUpdate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { PATCH } from "@/app/api/admin/users/[userId]/route";
import { getServerSession } from "next-auth";

const makeRequest = (userId: string, body: object) =>
    [
        new Request(`http://localhost/api/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ userId }) } as never,
    ] as const;

describe("PATCH /api/admin/users/[userId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "admin-1", isAdmin: true } } as never);
        mockUpdate.mockResolvedValue({ id: "u1", name: "Ana", isAdmin: true });
    });

    it("updates only the whitelisted fields", async () => {
        const [req, ctx] = makeRequest("u1", { name: "Ana", isAdmin: true });
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { name: "Ana", isAdmin: true },
        });
    });

    it("rejects fields outside the whitelist", async () => {
        const [req, ctx] = makeRequest("u1", { name: "Ana", activeGroupId: "g2" });
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects a wrongly typed field", async () => {
        const [req, ctx] = makeRequest("u1", { isAdmin: "yes" });
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("returns 403 when requester is not admin", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1", isAdmin: false } } as never);

        const [req, ctx] = makeRequest("u1", { name: "Ana" });
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(403);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const [req, ctx] = makeRequest("u1", { name: "Ana" });
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(401);
    });
});
