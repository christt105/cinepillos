import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCount, mockGroupCreate, mockMembershipCreate, mockUserUpdate } = vi.hoisted(() => ({
    mockCount: vi.fn(),
    mockGroupCreate: vi.fn(),
    mockMembershipCreate: vi.fn(),
    mockUserUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        membership: { count: mockCount, create: mockMembershipCreate },
        group: { create: mockGroupCreate },
        user: { update: mockUserUpdate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { POST } from "@/app/api/groups/route";
import { getServerSession } from "next-auth";

const makeRequest = (body: object) =>
    new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

describe("POST /api/groups", () => {
    beforeEach(() => vi.clearAllMocks());

    it("creates a group with the caller as OWNER and switches activeGroupId", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", isAdmin: false },
        } as never);
        mockCount.mockResolvedValue(0);
        mockGroupCreate.mockResolvedValue({ id: "g1", name: "Los Cinéfilos" });

        const res = await POST(makeRequest({ name: "Los Cinéfilos" }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.id).toBe("g1");
        expect(mockMembershipCreate).toHaveBeenCalledWith({
            data: { userId: "u1", groupId: "g1", role: "OWNER" },
        });
        expect(mockUserUpdate).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { activeGroupId: "g1" },
        });
    });

    it("returns 403 when a regular user already owns 3 groups", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", isAdmin: false },
        } as never);
        mockCount.mockResolvedValue(3);

        const res = await POST(makeRequest({ name: "Otro club" }));

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toBe("group_limit_reached");
        expect(mockGroupCreate).not.toHaveBeenCalled();
    });

    it("allows an admin up to 100 owned groups", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "admin-1", isAdmin: true },
        } as never);
        mockCount.mockResolvedValue(3);
        mockGroupCreate.mockResolvedValue({ id: "g2", name: "Club de admin" });

        const res = await POST(makeRequest({ name: "Club de admin" }));

        expect(res.status).toBe(200);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makeRequest({ name: "Los Cinéfilos" }));

        expect(res.status).toBe(401);
        expect(mockCount).not.toHaveBeenCalled();
    });

    it("returns 400 when the name is missing", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", isAdmin: false },
        } as never);

        const res = await POST(makeRequest({}));

        expect(res.status).toBe(400);
        expect(mockCount).not.toHaveBeenCalled();
    });

    it("returns 429 after too many creations in a row", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "rate-limited-user", isAdmin: false },
        } as never);
        mockCount.mockResolvedValue(0);
        mockGroupCreate.mockResolvedValue({ id: "g1", name: "Club" });

        for (let i = 0; i < 5; i++) {
            const ok = await POST(makeRequest({ name: `Club ${i}` }));
            expect(ok.status).toBe(200);
        }

        const res = await POST(makeRequest({ name: "One too many" }));

        expect(res.status).toBe(429);
    });
});
