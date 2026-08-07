import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockProposalFindUnique, mockProposalDelete, mockUserFindUnique, mockGroupFindUnique } = vi.hoisted(() => ({
    mockProposalFindUnique: vi.fn(),
    mockProposalDelete: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        proposal: { findUnique: mockProposalFindUnique, delete: mockProposalDelete },
        user: { findUnique: mockUserFindUnique },
        group: { findUnique: mockGroupFindUnique },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { DELETE } from "@/app/api/groups/[groupId]/proposals/[id]/route";
import { getServerSession } from "next-auth";
import { GROUP_ID, OTHER_GROUP_ID, group, memberUser, outsiderUser } from "../helpers/fixtures";

const makeRequest = (id: string, groupId = GROUP_ID) =>
    [
        new Request(`http://localhost/api/groups/${groupId}/proposals/${id}`, { method: "DELETE" }),
        { params: Promise.resolve({ groupId, id }) } as never,
    ] as const;

describe("DELETE /api/groups/[groupId]/proposals/[id]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("deletes the proposal when the owner requests it", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser());
        mockGroupFindUnique.mockResolvedValue(group);
        mockProposalFindUnique.mockResolvedValue({ id: "p1", userId: "u1", groupId: GROUP_ID });
        mockProposalDelete.mockResolvedValue({ id: "p1" });

        const res = await DELETE(...makeRequest("p1"));

        expect(res.status).toBe(204);
        expect(mockProposalDelete).toHaveBeenCalledOnce();
    });

    it("returns 403 when the user is not a member of that group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } } as never);
        mockUserFindUnique.mockResolvedValue(outsiderUser());
        mockGroupFindUnique.mockResolvedValue(group);

        const res = await DELETE(...makeRequest("p1"));

        expect(res.status).toBe(403);
        expect(mockProposalDelete).not.toHaveBeenCalled();
    });

    it("returns 404 when the proposal belongs to another group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser());
        mockGroupFindUnique.mockResolvedValue(group);
        mockProposalFindUnique.mockResolvedValue({ id: "p1", userId: "u1", groupId: OTHER_GROUP_ID });

        const res = await DELETE(...makeRequest("p1"));

        expect(res.status).toBe(404);
        expect(mockProposalDelete).not.toHaveBeenCalled();
    });

    it("returns 403 when a group member deletes someone else's proposal", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser());
        mockGroupFindUnique.mockResolvedValue(group);
        mockProposalFindUnique.mockResolvedValue({ id: "p1", userId: "u9", groupId: GROUP_ID });

        const res = await DELETE(...makeRequest("p1"));

        expect(res.status).toBe(403);
        expect(mockProposalDelete).not.toHaveBeenCalled();
    });

    it("returns 404 when the proposal does not exist", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser());
        mockGroupFindUnique.mockResolvedValue(group);
        mockProposalFindUnique.mockResolvedValue(null);

        const res = await DELETE(...makeRequest("ghost"));

        expect(res.status).toBe(404);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await DELETE(...makeRequest("p1"));

        expect(res.status).toBe(401);
    });
});
