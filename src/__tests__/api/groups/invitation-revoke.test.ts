import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique, mockGroupFindUnique, mockInvitationFindUnique, mockInvitationUpdate } = vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
    mockInvitationFindUnique: vi.fn(),
    mockInvitationUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mockUserFindUnique },
        group: { findUnique: mockGroupFindUnique },
        invitation: { findUnique: mockInvitationFindUnique, update: mockInvitationUpdate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { DELETE } from "@/app/api/groups/[groupId]/invitations/[invitationId]/route";
import { getServerSession } from "next-auth";
import { GROUP_ID, group, memberUser } from "../../helpers/fixtures";

const context = (groupId: string, invitationId: string) =>
    ({ params: Promise.resolve({ groupId, invitationId }) }) as never;

const makeDelete = (groupId: string, invitationId: string) =>
    new Request(`http://localhost/api/groups/${groupId}/invitations/${invitationId}`, { method: "DELETE" });

describe("DELETE /api/groups/[groupId]/invitations/[invitationId]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lets the owner revoke an invitation of their own group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner-1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser("OWNER", "owner-1", GROUP_ID));
        mockGroupFindUnique.mockResolvedValue(group);
        mockInvitationFindUnique.mockResolvedValue({ id: "inv1", groupId: GROUP_ID });

        const res = await DELETE(makeDelete(GROUP_ID, "inv1"), context(GROUP_ID, "inv1"));

        expect(res.status).toBe(200);
        expect(mockInvitationUpdate).toHaveBeenCalledWith({
            where: { id: "inv1" },
            data: { revokedAt: expect.any(Date) },
        });
    });

    it("refuses a regular member", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "member-1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser("MEMBER", "member-1", GROUP_ID));
        mockGroupFindUnique.mockResolvedValue(group);

        const res = await DELETE(makeDelete(GROUP_ID, "inv1"), context(GROUP_ID, "inv1"));

        expect(res.status).toBe(403);
        expect(mockInvitationUpdate).not.toHaveBeenCalled();
    });

    it("returns 404 when the invitation belongs to another group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner-1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser("OWNER", "owner-1", GROUP_ID));
        mockGroupFindUnique.mockResolvedValue(group);
        mockInvitationFindUnique.mockResolvedValue({ id: "inv1", groupId: "some-other-group" });

        const res = await DELETE(makeDelete(GROUP_ID, "inv1"), context(GROUP_ID, "inv1"));

        expect(res.status).toBe(404);
        expect(mockInvitationUpdate).not.toHaveBeenCalled();
    });
});
