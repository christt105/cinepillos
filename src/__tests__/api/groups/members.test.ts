import { describe, it, expect, vi, beforeEach } from "vitest";

const {
    mockUserFindUnique,
    mockGroupFindUnique,
    mockMembershipFindUnique,
    mockMembershipDelete,
    mockMembershipCount,
    mockMembershipUpdate,
    mockMembershipUpdateMany,
    mockTransaction,
} = vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
    mockMembershipFindUnique: vi.fn(),
    mockMembershipDelete: vi.fn(),
    mockMembershipCount: vi.fn(),
    mockMembershipUpdate: vi.fn(),
    mockMembershipUpdateMany: vi.fn(),
    mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mockUserFindUnique },
        group: { findUnique: mockGroupFindUnique },
        membership: {
            findUnique: mockMembershipFindUnique,
            delete: mockMembershipDelete,
            count: mockMembershipCount,
            update: mockMembershipUpdate,
            updateMany: mockMembershipUpdateMany,
        },
        $transaction: mockTransaction,
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { DELETE, PATCH } from "@/app/api/groups/[groupId]/members/[userId]/route";
import { getServerSession } from "next-auth";
import { GROUP_ID, group, memberUser } from "../../helpers/fixtures";

const context = (groupId: string, userId: string) => ({ params: Promise.resolve({ groupId, userId }) }) as never;

const makeDelete = (groupId: string, userId: string) =>
    new Request(`http://localhost/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });

const makePatch = (groupId: string, userId: string, body: unknown) =>
    new Request(`http://localhost/api/groups/${groupId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

const signIn = (userId: string, role: string) => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    mockUserFindUnique.mockResolvedValue(memberUser(role, userId, GROUP_ID));
    mockGroupFindUnique.mockResolvedValue(group);
};

beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
            membership: { update: mockMembershipUpdate, updateMany: mockMembershipUpdateMany },
        })
    );
});

describe("DELETE /api/groups/[groupId]/members/[userId]", () => {
    it("lets a member leave on their own", async () => {
        signIn("member-1", "MEMBER");
        mockMembershipFindUnique.mockResolvedValue({ id: "mb1", userId: "member-1", groupId: GROUP_ID, role: "MEMBER" });

        const res = await DELETE(makeDelete(GROUP_ID, "member-1"), context(GROUP_ID, "member-1"));

        expect(res.status).toBe(200);
        expect(mockMembershipDelete).toHaveBeenCalledWith({ where: { id: "mb1" } });
    });

    it("lets the owner remove someone else", async () => {
        signIn("owner-1", "OWNER");
        mockMembershipFindUnique.mockResolvedValue({ id: "mb2", userId: "member-2", groupId: GROUP_ID, role: "MEMBER" });

        const res = await DELETE(makeDelete(GROUP_ID, "member-2"), context(GROUP_ID, "member-2"));

        expect(res.status).toBe(200);
        expect(mockMembershipDelete).toHaveBeenCalledWith({ where: { id: "mb2" } });
    });

    it("refuses a regular member removing someone else", async () => {
        signIn("member-1", "MEMBER");

        const res = await DELETE(makeDelete(GROUP_ID, "member-2"), context(GROUP_ID, "member-2"));

        expect(res.status).toBe(403);
        expect(mockMembershipDelete).not.toHaveBeenCalled();
    });

    it("returns 404 when the target has no membership", async () => {
        signIn("owner-1", "OWNER");
        mockMembershipFindUnique.mockResolvedValue(null);

        const res = await DELETE(makeDelete(GROUP_ID, "ghost"), context(GROUP_ID, "ghost"));

        expect(res.status).toBe(404);
    });

    it("refuses to let the only owner leave the group ownerless", async () => {
        signIn("owner-1", "OWNER");
        mockMembershipFindUnique.mockResolvedValue({ id: "mb1", userId: "owner-1", groupId: GROUP_ID, role: "OWNER" });
        mockMembershipCount.mockResolvedValue(1);

        const res = await DELETE(makeDelete(GROUP_ID, "owner-1"), context(GROUP_ID, "owner-1"));

        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({ error: "last_owner" });
        expect(mockMembershipDelete).not.toHaveBeenCalled();
    });

    it("lets an owner leave once the group has another one", async () => {
        signIn("owner-1", "OWNER");
        mockMembershipFindUnique.mockResolvedValue({ id: "mb1", userId: "owner-1", groupId: GROUP_ID, role: "OWNER" });
        mockMembershipCount.mockResolvedValue(2);

        const res = await DELETE(makeDelete(GROUP_ID, "owner-1"), context(GROUP_ID, "owner-1"));

        expect(res.status).toBe(200);
        expect(mockMembershipDelete).toHaveBeenCalledWith({ where: { id: "mb1" } });
    });
});

describe("PATCH /api/groups/[groupId]/members/[userId]", () => {
    it("hands the club over and steps the previous owner down", async () => {
        signIn("owner-1", "OWNER");
        mockMembershipFindUnique.mockResolvedValue({ id: "mb2", userId: "member-2", groupId: GROUP_ID, role: "MEMBER" });
        mockMembershipUpdate.mockResolvedValue({ id: "mb2", role: "OWNER" });

        const res = await PATCH(
            makePatch(GROUP_ID, "member-2", { role: "OWNER" }),
            context(GROUP_ID, "member-2")
        );

        expect(res.status).toBe(200);
        expect(mockMembershipUpdateMany).toHaveBeenCalledWith({
            where: { groupId: GROUP_ID, role: "OWNER" },
            data: { role: "MEMBER" },
        });
        expect(mockMembershipUpdate).toHaveBeenCalledWith({
            where: { id: "mb2" },
            data: { role: "OWNER" },
        });
    });

    it("refuses a regular member handing the club to themselves", async () => {
        signIn("member-1", "MEMBER");

        const res = await PATCH(
            makePatch(GROUP_ID, "member-1", { role: "OWNER" }),
            context(GROUP_ID, "member-1")
        );

        expect(res.status).toBe(403);
        expect(mockMembershipUpdate).not.toHaveBeenCalled();
    });

    it("refuses to demote the only owner", async () => {
        signIn("owner-1", "OWNER");
        mockMembershipFindUnique.mockResolvedValue({ id: "mb1", userId: "owner-1", groupId: GROUP_ID, role: "OWNER" });
        mockMembershipCount.mockResolvedValue(1);

        const res = await PATCH(
            makePatch(GROUP_ID, "owner-1", { role: "MEMBER" }),
            context(GROUP_ID, "owner-1")
        );

        expect(res.status).toBe(409);
        expect(mockMembershipUpdate).not.toHaveBeenCalled();
    });

    it("returns 404 when the target is not a member", async () => {
        signIn("owner-1", "OWNER");
        mockMembershipFindUnique.mockResolvedValue(null);

        const res = await PATCH(makePatch(GROUP_ID, "ghost", { role: "OWNER" }), context(GROUP_ID, "ghost"));

        expect(res.status).toBe(404);
    });

    it("rejects an unknown role", async () => {
        signIn("owner-1", "OWNER");

        const res = await PATCH(
            makePatch(GROUP_ID, "member-2", { role: "SUPERUSER" }),
            context(GROUP_ID, "member-2")
        );

        expect(res.status).toBe(400);
        expect(mockMembershipUpdate).not.toHaveBeenCalled();
    });
});
