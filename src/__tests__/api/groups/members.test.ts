import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique, mockGroupFindUnique, mockMembershipFindUnique, mockMembershipDelete } = vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
    mockMembershipFindUnique: vi.fn(),
    mockMembershipDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mockUserFindUnique },
        group: { findUnique: mockGroupFindUnique },
        membership: { findUnique: mockMembershipFindUnique, delete: mockMembershipDelete },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { DELETE } from "@/app/api/groups/[groupId]/members/[userId]/route";
import { getServerSession } from "next-auth";
import { GROUP_ID, group, memberUser } from "../../helpers/fixtures";

const context = (groupId: string, userId: string) => ({ params: Promise.resolve({ groupId, userId }) }) as never;

const makeDelete = (groupId: string, userId: string) =>
    new Request(`http://localhost/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });

describe("DELETE /api/groups/[groupId]/members/[userId]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lets a member leave on their own", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "member-1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser("MEMBER", "member-1", GROUP_ID));
        mockGroupFindUnique.mockResolvedValue(group);
        mockMembershipFindUnique.mockResolvedValue({ id: "mb1", userId: "member-1", groupId: GROUP_ID });

        const res = await DELETE(makeDelete(GROUP_ID, "member-1"), context(GROUP_ID, "member-1"));

        expect(res.status).toBe(200);
        expect(mockMembershipDelete).toHaveBeenCalledWith({ where: { id: "mb1" } });
    });

    it("lets the owner remove someone else", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner-1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser("OWNER", "owner-1", GROUP_ID));
        mockGroupFindUnique.mockResolvedValue(group);
        mockMembershipFindUnique.mockResolvedValue({ id: "mb2", userId: "member-2", groupId: GROUP_ID });

        const res = await DELETE(makeDelete(GROUP_ID, "member-2"), context(GROUP_ID, "member-2"));

        expect(res.status).toBe(200);
        expect(mockMembershipDelete).toHaveBeenCalledWith({ where: { id: "mb2" } });
    });

    it("refuses a regular member removing someone else", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "member-1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser("MEMBER", "member-1", GROUP_ID));
        mockGroupFindUnique.mockResolvedValue(group);

        const res = await DELETE(makeDelete(GROUP_ID, "member-2"), context(GROUP_ID, "member-2"));

        expect(res.status).toBe(403);
        expect(mockMembershipDelete).not.toHaveBeenCalled();
    });

    it("returns 404 when the target has no membership", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner-1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser("OWNER", "owner-1", GROUP_ID));
        mockGroupFindUnique.mockResolvedValue(group);
        mockMembershipFindUnique.mockResolvedValue(null);

        const res = await DELETE(makeDelete(GROUP_ID, "ghost"), context(GROUP_ID, "ghost"));

        expect(res.status).toBe(404);
    });
});
