import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique, mockGroupFindUnique, mockInvitationCreate, mockInvitationFindMany } = vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
    mockInvitationCreate: vi.fn(),
    mockInvitationFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mockUserFindUnique },
        group: { findUnique: mockGroupFindUnique },
        invitation: { create: mockInvitationCreate, findMany: mockInvitationFindMany },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { POST, GET } from "@/app/api/groups/[groupId]/invitations/route";
import { getServerSession } from "next-auth";
import { GROUP_ID, group, memberUser, outsiderUser } from "../../helpers/fixtures";

const context = (groupId: string) => ({ params: Promise.resolve({ groupId }) }) as never;

const makePost = (groupId: string, body: object = { expiresInDays: 7 }) =>
    new Request(`http://localhost/api/groups/${groupId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

const makeGet = (groupId: string) =>
    new Request(`http://localhost/api/groups/${groupId}/invitations`);

const asOwner = (userId = "owner-1") => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    mockUserFindUnique.mockResolvedValue(memberUser("OWNER", userId, GROUP_ID));
    mockGroupFindUnique.mockResolvedValue(group);
};

const asMember = (userId = "member-1") => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    mockUserFindUnique.mockResolvedValue(memberUser("MEMBER", userId, GROUP_ID));
    mockGroupFindUnique.mockResolvedValue(group);
};

const asOutsider = (userId = "outsider-1") => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
    mockUserFindUnique.mockResolvedValue(outsiderUser(userId));
    mockGroupFindUnique.mockResolvedValue(group);
};

describe("POST /api/groups/[groupId]/invitations", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lets the owner create an invitation", async () => {
        asOwner();
        mockInvitationCreate.mockResolvedValue({ id: "inv1", token: "abc", groupId: GROUP_ID });

        const res = await POST(makePost(GROUP_ID), context(GROUP_ID));

        expect(res.status).toBe(200);
        expect(mockInvitationCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ groupId: GROUP_ID, invitedBy: "owner-1" }),
            })
        );
    });

    it("refuses a regular member", async () => {
        asMember();

        const res = await POST(makePost(GROUP_ID), context(GROUP_ID));

        expect(res.status).toBe(403);
        expect(mockInvitationCreate).not.toHaveBeenCalled();
    });

    it("refuses an outsider with a 403, not leaking membership status", async () => {
        asOutsider();

        const res = await POST(makePost(GROUP_ID), context(GROUP_ID));

        expect(res.status).toBe(403);
        expect(mockInvitationCreate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makePost(GROUP_ID), context(GROUP_ID));

        expect(res.status).toBe(401);
    });

    it("rate limits repeated creation", async () => {
        asOwner("rate-owner");
        mockInvitationCreate.mockResolvedValue({ id: "inv1", token: "abc", groupId: GROUP_ID });

        for (let i = 0; i < 10; i++) {
            const ok = await POST(makePost(GROUP_ID), context(GROUP_ID));
            expect(ok.status).toBe(200);
        }

        const res = await POST(makePost(GROUP_ID), context(GROUP_ID));

        expect(res.status).toBe(429);
    });
});

describe("GET /api/groups/[groupId]/invitations", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lists invitations for the owner", async () => {
        asOwner();
        mockInvitationFindMany.mockResolvedValue([{ id: "inv1" }]);

        const res = await GET(makeGet(GROUP_ID), context(GROUP_ID));

        expect(res.status).toBe(200);
        expect(await res.json()).toHaveLength(1);
    });

    it("refuses a regular member", async () => {
        asMember();

        const res = await GET(makeGet(GROUP_ID), context(GROUP_ID));

        expect(res.status).toBe(403);
        expect(mockInvitationFindMany).not.toHaveBeenCalled();
    });
});
