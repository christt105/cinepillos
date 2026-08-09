import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique, mockGroupFindUnique, mockGroupUpdate, mockGroupDelete } = vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
    mockGroupUpdate: vi.fn(),
    mockGroupDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mockUserFindUnique },
        group: { findUnique: mockGroupFindUnique, update: mockGroupUpdate, delete: mockGroupDelete },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { PATCH, DELETE } from "@/app/api/groups/[groupId]/route";
import { getServerSession } from "next-auth";
import { GROUP_ID, group, memberUser, adminUser } from "../../helpers/fixtures";

const context = (groupId: string) => ({ params: Promise.resolve({ groupId }) }) as never;

const patchRequest = (body: unknown) =>
    new Request(`http://localhost/api/groups/${GROUP_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

const deleteRequest = () =>
    new Request(`http://localhost/api/groups/${GROUP_ID}`, { method: "DELETE" });

const signIn = (userId: string, user: { isAdmin: boolean }) => {
    vi.mocked(getServerSession).mockResolvedValue({
        user: { id: userId, isAdmin: user.isAdmin },
    } as never);
    mockUserFindUnique.mockResolvedValue(user);
    mockGroupFindUnique.mockResolvedValue(group);
};

describe("PATCH /api/groups/[groupId]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lets the owner rename the group", async () => {
        signIn("owner-1", memberUser("OWNER", "owner-1", GROUP_ID));
        mockGroupUpdate.mockResolvedValue({ ...group, name: "Cinepillos" });

        const res = await PATCH(patchRequest({ name: "Cinepillos" }), context(GROUP_ID));

        expect(res.status).toBe(200);
        expect(mockGroupUpdate).toHaveBeenCalledWith({
            where: { id: GROUP_ID },
            data: { name: "Cinepillos" },
        });
    });

    it("refuses a regular member", async () => {
        signIn("member-1", memberUser("MEMBER", "member-1", GROUP_ID));

        const res = await PATCH(patchRequest({ name: "Cinepillos" }), context(GROUP_ID));

        expect(res.status).toBe(403);
        expect(mockGroupUpdate).not.toHaveBeenCalled();
    });

    it("rejects an empty name", async () => {
        signIn("owner-1", memberUser("OWNER", "owner-1", GROUP_ID));

        const res = await PATCH(patchRequest({ name: "" }), context(GROUP_ID));

        expect(res.status).toBe(400);
        expect(mockGroupUpdate).not.toHaveBeenCalled();
    });
});

describe("DELETE /api/groups/[groupId]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lets the owner delete the group", async () => {
        signIn("owner-1", memberUser("OWNER", "owner-1", GROUP_ID));
        mockGroupDelete.mockResolvedValue(group);

        const res = await DELETE(deleteRequest(), context(GROUP_ID));

        expect(res.status).toBe(200);
        expect(mockGroupDelete).toHaveBeenCalledWith({ where: { id: GROUP_ID } });
    });

    it("lets a site admin delete a group they do not belong to", async () => {
        signIn("admin", adminUser("admin"));
        mockGroupDelete.mockResolvedValue(group);

        const res = await DELETE(deleteRequest(), context(GROUP_ID));

        expect(res.status).toBe(200);
        expect(mockGroupDelete).toHaveBeenCalledWith({ where: { id: GROUP_ID } });
    });

    it("refuses a regular member", async () => {
        signIn("member-1", memberUser("MEMBER", "member-1", GROUP_ID));

        const res = await DELETE(deleteRequest(), context(GROUP_ID));

        expect(res.status).toBe(403);
        expect(mockGroupDelete).not.toHaveBeenCalled();
    });

    it("refuses an outsider without leaking that the group exists", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "outsider" } } as never);
        mockUserFindUnique.mockResolvedValue({ id: "outsider", isAdmin: false, memberships: [] });
        mockGroupFindUnique.mockResolvedValue(group);

        const res = await DELETE(deleteRequest(), context(GROUP_ID));

        expect(res.status).toBe(403);
        expect(mockGroupDelete).not.toHaveBeenCalled();
    });
});
