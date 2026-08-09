import { describe, it, expect, vi, beforeEach } from "vitest";

const {
    mockInvitationFindUnique,
    mockInvitationFindUniqueOrThrow,
    mockInvitationUpdate,
    mockMembershipFindUnique,
    mockMembershipCount,
    mockMembershipCreate,
    mockUserUpdate,
    mockTransaction,
} = vi.hoisted(() => ({
    mockInvitationFindUnique: vi.fn(),
    mockInvitationFindUniqueOrThrow: vi.fn(),
    mockInvitationUpdate: vi.fn(),
    mockMembershipFindUnique: vi.fn(),
    mockMembershipCount: vi.fn(),
    mockMembershipCreate: vi.fn(),
    mockUserUpdate: vi.fn(),
    mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        invitation: {
            findUnique: mockInvitationFindUnique,
            findUniqueOrThrow: mockInvitationFindUniqueOrThrow,
            update: mockInvitationUpdate,
        },
        membership: {
            findUnique: mockMembershipFindUnique,
            count: mockMembershipCount,
            create: mockMembershipCreate,
        },
        user: { update: mockUserUpdate },
        $transaction: mockTransaction,
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { GET, POST } from "@/app/api/invitations/[token]/route";
import { getServerSession } from "next-auth";

const group = { id: "g1", name: "Los Cinéfilos" };
const context = (token: string) => ({ params: Promise.resolve({ token }) }) as never;
const makeGet = (token: string) => new Request(`http://localhost/api/invitations/${token}`);
const makePost = (token: string) => new Request(`http://localhost/api/invitations/${token}`, { method: "POST" });

const signIn = (userId = "u1") => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as never);
};

describe("GET /api/invitations/[token]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns not_found for an unknown token", async () => {
        signIn();
        mockInvitationFindUnique.mockResolvedValue(null);

        const res = await GET(makeGet("bogus"), context("bogus"));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: "not_found" });
    });

    it("returns expired for a lapsed invitation", async () => {
        signIn();
        mockInvitationFindUnique.mockResolvedValue({
            id: "inv1",
            token: "abc",
            expiresAt: new Date(Date.now() - 1000),
            maxUses: null,
            useCount: 0,
            revokedAt: null,
            group,
        });

        const res = await GET(makeGet("abc"), context("abc"));

        expect(await res.json()).toEqual({ status: "expired", group });
    });

    it("returns already_member when the caller is already in the group", async () => {
        signIn("u1");
        mockInvitationFindUnique.mockResolvedValue({
            id: "inv1",
            token: "abc",
            expiresAt: new Date(Date.now() + 86400000),
            maxUses: null,
            useCount: 0,
            revokedAt: null,
            group,
        });
        mockMembershipFindUnique.mockResolvedValue({ id: "mb1", userId: "u1", groupId: "g1" });

        const res = await GET(makeGet("abc"), context("abc"));

        expect(await res.json()).toEqual({ status: "already_member", group });
    });

    it("returns valid for a healthy, unused invitation", async () => {
        signIn("u1");
        mockInvitationFindUnique.mockResolvedValue({
            id: "inv1",
            token: "abc",
            expiresAt: new Date(Date.now() + 86400000),
            maxUses: null,
            useCount: 0,
            revokedAt: null,
            group,
        });
        mockMembershipFindUnique.mockResolvedValue(null);
        mockMembershipCount.mockResolvedValue(5);

        const res = await GET(makeGet("abc"), context("abc"));

        expect(await res.json()).toEqual({ status: "valid", group });
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await GET(makeGet("abc"), context("abc"));

        expect(res.status).toBe(401);
    });
});

describe("POST /api/invitations/[token]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("accepts a valid invitation and creates a membership", async () => {
        signIn("u1");
        mockInvitationFindUnique.mockResolvedValue({
            id: "inv1",
            token: "abc",
            expiresAt: new Date(Date.now() + 86400000),
            maxUses: null,
            useCount: 0,
            revokedAt: null,
            group,
        });
        mockMembershipFindUnique.mockResolvedValue(null);
        mockMembershipCount.mockResolvedValue(5);
        mockInvitationFindUniqueOrThrow.mockResolvedValue({ id: "inv1", groupId: "g1" });
        mockTransaction.mockResolvedValue([{}, {}, {}]);

        const res = await POST(makePost("abc"), context("abc"));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ groupId: "g1" });
        expect(mockTransaction).toHaveBeenCalled();
    });

    it("refuses to accept an expired invitation", async () => {
        signIn("u1");
        mockInvitationFindUnique.mockResolvedValue({
            id: "inv1",
            token: "abc",
            expiresAt: new Date(Date.now() - 1000),
            maxUses: null,
            useCount: 0,
            revokedAt: null,
            group,
        });

        const res = await POST(makePost("abc"), context("abc"));

        expect(res.status).toBe(409);
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("refuses a group that is already full", async () => {
        signIn("u1");
        mockInvitationFindUnique.mockResolvedValue({
            id: "inv1",
            token: "abc",
            expiresAt: new Date(Date.now() + 86400000),
            maxUses: null,
            useCount: 0,
            revokedAt: null,
            group,
        });
        mockMembershipFindUnique.mockResolvedValue(null);
        mockMembershipCount.mockResolvedValue(30);

        const res = await POST(makePost("abc"), context("abc"));

        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.error).toBe("group_full");
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makePost("abc"), context("abc"));

        expect(res.status).toBe(401);
    });
});
