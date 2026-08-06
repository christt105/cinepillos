import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
    mockCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        group: { create: mockCreate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { POST } from "@/app/api/admin/groups/route";
import { getServerSession } from "next-auth";

const makeRequest = (body: object) =>
    new Request("http://localhost/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

describe("POST /api/admin/groups", () => {
    beforeEach(() => vi.clearAllMocks());

    it("creates a group when requester is admin", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "admin-1", isAdmin: true },
        } as never);

        mockCreate.mockResolvedValue({ id: "g1", name: "Zorropillos" });

        const res = await POST(makeRequest({ name: "Zorropillos" }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.name).toBe("Zorropillos");
        expect(mockCreate).toHaveBeenCalledWith({ data: { name: "Zorropillos" } });
    });

    it("returns 403 when requester is not admin", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "user-1", isAdmin: false },
        } as never);

        const res = await POST(makeRequest({ name: "Zorropillos" }));

        expect(res.status).toBe(403);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makeRequest({ name: "Zorropillos" }));

        expect(res.status).toBe(401);
    });
});
