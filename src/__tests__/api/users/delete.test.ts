import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDelete } = vi.hoisted(() => ({
    mockDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { delete: mockDelete },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { DELETE } from "@/app/api/users/[id]/route";
import { getServerSession } from "next-auth";

const makeRequest = (id: string) =>
    [
        new Request(`http://localhost/api/users/${id}`, { method: "DELETE" }),
        { params: Promise.resolve({ id }) } as never,
    ] as const;

describe("DELETE /api/users/[id]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("deletes the caller's own account", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockDelete.mockResolvedValue({ id: "u1" });

        const res = await DELETE(...makeRequest("u1"));

        expect(res.status).toBe(200);
        expect(mockDelete).toHaveBeenCalledWith({ where: { id: "u1" } });
    });

    it("returns 403 when trying to delete someone else's account", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        const res = await DELETE(...makeRequest("u2"));

        expect(res.status).toBe(403);
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await DELETE(...makeRequest("u1"));

        expect(res.status).toBe(401);
        expect(mockDelete).not.toHaveBeenCalled();
    });
});
