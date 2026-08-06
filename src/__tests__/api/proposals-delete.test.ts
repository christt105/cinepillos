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

import { DELETE } from "@/app/api/proposals/[id]/route";
import { getServerSession } from "next-auth";
import { group, memberUser, outsiderUser } from "../helpers/fixtures";

const makeRequest = (id: string) =>
    [
        new Request(`http://localhost/api/proposals/${id}`, { method: "DELETE" }),
        { params: Promise.resolve({ id }) },
    ] as const;

describe("DELETE /api/proposals/[id]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("deletes the proposal when the owner requests it", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockProposalFindUnique.mockResolvedValue({ id: "p1", userId: "u1", groupId: "g1" });
        mockUserFindUnique.mockResolvedValue(memberUser());
        mockGroupFindUnique.mockResolvedValue(group);
        mockProposalDelete.mockResolvedValue({ id: "p1" });

        const [req, ctx] = makeRequest("p1");
        const res = await DELETE(req, ctx);

        expect(res.status).toBe(204);
        expect(mockProposalDelete).toHaveBeenCalledOnce();
    });

    it("returns 403 when the proposal belongs to another group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } } as never);
        mockProposalFindUnique.mockResolvedValue({ id: "p1", userId: "u2", groupId: "g1" });
        mockUserFindUnique.mockResolvedValue(outsiderUser());
        mockGroupFindUnique.mockResolvedValue(group);

        const [req, ctx] = makeRequest("p1");
        const res = await DELETE(req, ctx);

        expect(res.status).toBe(403);
        expect(mockProposalDelete).not.toHaveBeenCalled();
    });

    it("returns 403 when a group member deletes someone else's proposal", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockProposalFindUnique.mockResolvedValue({ id: "p1", userId: "u9", groupId: "g1" });
        mockUserFindUnique.mockResolvedValue(memberUser());
        mockGroupFindUnique.mockResolvedValue(group);

        const [req, ctx] = makeRequest("p1");
        const res = await DELETE(req, ctx);

        expect(res.status).toBe(403);
        expect(mockProposalDelete).not.toHaveBeenCalled();
    });

    it("returns 404 when the proposal does not exist", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockProposalFindUnique.mockResolvedValue(null);

        const [req, ctx] = makeRequest("ghost");
        const res = await DELETE(req, ctx);

        expect(res.status).toBe(404);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const [req, ctx] = makeRequest("p1");
        const res = await DELETE(req, ctx);

        expect(res.status).toBe(401);
    });
});
