import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockFindFirst, mockUpdate, mockCompare } = vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockFindFirst: vi.fn(),
    mockUpdate: vi.fn(),
    mockCompare: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mockFindUnique, findFirst: mockFindFirst, update: mockUpdate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

vi.mock("bcryptjs", () => ({
    default: {
        hash: vi.fn(async (pw: string) => `hashed:${pw}`),
        compare: mockCompare,
    },
}));

import { PATCH } from "@/app/api/users/[id]/route";
import { getServerSession } from "next-auth";

const makeRequest = (body: object) =>
    new Request("http://localhost/api/users/u1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

const params = Promise.resolve({ id: "u1" });

describe("PATCH /api/users/[id] password change", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFindUnique.mockResolvedValue({ id: "u1", password: "hashed:old" });
        mockUpdate.mockResolvedValue({ id: "u1" });
    });

    it("rejects a self password change without the current one", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1", isAdmin: false } } as never);

        const res = await PATCH(makeRequest({ newPassword: "5678" }), { params });

        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe("current_password_required");
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects a self password change with a wrong current one", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1", isAdmin: false } } as never);
        mockCompare.mockResolvedValue(false);

        const res = await PATCH(makeRequest({ currentPassword: "wrong", newPassword: "5678" }), { params });

        expect(res.status).toBe(403);
        expect((await res.json()).error).toBe("current_password_invalid");
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("accepts a self password change with the right current one", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1", isAdmin: false } } as never);
        mockCompare.mockResolvedValue(true);

        const res = await PATCH(makeRequest({ currentPassword: "old", newPassword: "5678" }), { params });

        expect(res.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { password: "hashed:5678" },
        });
    });

    it("lets an admin reset someone else's password without the current one", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "admin-1", isAdmin: true } } as never);

        const res = await PATCH(makeRequest({ newPassword: "5678" }), { params });

        expect(res.status).toBe(200);
        expect(mockCompare).not.toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { password: "hashed:5678" },
        });
    });
});
