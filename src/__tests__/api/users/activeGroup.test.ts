import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique, mockUserUpdate, mockGroupFindUnique } = vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockUserUpdate: vi.fn(),
    mockGroupFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
        group: { findUnique: mockGroupFindUnique },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { POST } from "@/app/api/users/activeGroup/route";
import { getServerSession } from "next-auth";
import { group, memberUser, outsiderUser } from "../../helpers/fixtures";

const makeRequest = (body: object) =>
    new Request("http://localhost/api/users/activeGroup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

describe("POST /api/users/activeGroup", () => {
    beforeEach(() => vi.clearAllMocks());

    it("switches the active group when the user is a member", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser());
        mockGroupFindUnique.mockResolvedValue(group);
        mockUserUpdate.mockResolvedValue({ id: "u1", activeGroupId: "g1" });

        const res = await POST(makeRequest({ groupId: "g1" }));

        expect(res.status).toBe(200);
        expect(mockUserUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "u1" }, data: { activeGroupId: "g1" } })
        );
    });

    it("returns 403 when the user is not a member of the requested group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } } as never);
        mockUserFindUnique.mockResolvedValue(outsiderUser());
        mockGroupFindUnique.mockResolvedValue(group);

        const res = await POST(makeRequest({ groupId: "g1" }));

        expect(res.status).toBe(403);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("returns 403 when the group does not exist", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser());
        mockGroupFindUnique.mockResolvedValue(null);

        const res = await POST(makeRequest({ groupId: "ghost" }));

        expect(res.status).toBe(403);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makeRequest({ groupId: "g1" }));

        expect(res.status).toBe(401);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });
});
