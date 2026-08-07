import { describe, it, expect, vi, beforeEach } from "vitest";

const {
    mockFilmUpsert,
    mockProposalFindFirst,
    mockProposalFindMany,
    mockProposalCreate,
    mockUserFindUnique,
    mockGroupFindUnique,
} = vi.hoisted(() => ({
    mockFilmUpsert: vi.fn(),
    mockProposalFindFirst: vi.fn(),
    mockProposalFindMany: vi.fn(),
    mockProposalCreate: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        film: { upsert: mockFilmUpsert },
        proposal: {
            findFirst: mockProposalFindFirst,
            findMany: mockProposalFindMany,
            create: mockProposalCreate,
        },
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

import { GET, POST } from "@/app/api/groups/[groupId]/proposals/route";
import { getServerSession } from "next-auth";
import { GROUP_ID, group, memberUser, outsiderUser } from "../helpers/fixtures";

const makeGet = (groupId: string, query = "") =>
    [
        new Request(`http://localhost/api/groups/${groupId}/proposals${query}`),
        { params: Promise.resolve({ groupId }) } as never,
    ] as const;

const makePost = (groupId: string, body: object) =>
    [
        new Request(`http://localhost/api/groups/${groupId}/proposals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ groupId }) } as never,
    ] as const;

const asMember = () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    mockUserFindUnique.mockResolvedValue(memberUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

const asOutsider = () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } } as never);
    mockUserFindUnique.mockResolvedValue(outsiderUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

describe("GET /api/groups/[groupId]/proposals", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns the proposals of the current user in that group", async () => {
        asMember();

        mockProposalFindMany.mockResolvedValue([{ id: "p1", filmId: "film1", film: {}, user: {} }]);

        const res = await GET(...makeGet(GROUP_ID));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(1);
        expect(mockProposalFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ userId: "u1", groupId: GROUP_ID }) })
        );
    });

    it("returns all group proposals with scope=all", async () => {
        asMember();

        mockProposalFindMany.mockResolvedValue([]);

        const res = await GET(...makeGet(GROUP_ID, "?scope=all"));

        expect(res.status).toBe(200);
        expect(mockProposalFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { groupId: GROUP_ID } })
        );
    });

    it("returns 403 when the user is not a member of that group", async () => {
        asOutsider();

        const res = await GET(...makeGet(GROUP_ID, "?scope=all"));

        expect(res.status).toBe(403);
        expect(mockProposalFindMany).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await GET(...makeGet(GROUP_ID));

        expect(res.status).toBe(401);
    });
});

describe("POST /api/groups/[groupId]/proposals", () => {
    beforeEach(() => vi.clearAllMocks());

    it("creates a proposal after upserting the film", async () => {
        asMember();

        mockFilmUpsert.mockResolvedValue({ id: "film1", tmdbId: 12345, title: "Oppenheimer" });
        mockProposalFindFirst.mockResolvedValue(null);
        mockProposalCreate.mockResolvedValue({ id: "p1", userId: "u1", filmId: "film1", groupId: GROUP_ID });

        const res = await POST(...makePost(GROUP_ID, { tmdbId: 12345, title: "Oppenheimer", overview: "...", posterPath: "/x.jpg" }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.id).toBe("p1");
        expect(mockProposalCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ groupId: GROUP_ID, userId: "u1" }) })
        );
    });

    it("returns existing proposal without creating duplicate", async () => {
        asMember();

        mockFilmUpsert.mockResolvedValue({ id: "film1", tmdbId: 12345 });
        mockProposalFindFirst.mockResolvedValue({ id: "p1", userId: "u1", filmId: "film1" });

        const res = await POST(...makePost(GROUP_ID, { tmdbId: 12345, title: "Oppenheimer", overview: "...", posterPath: "/x.jpg" }));

        expect(res.status).toBe(200);
        expect(mockProposalCreate).not.toHaveBeenCalled();
    });

    it("returns 403 when the user is not a member of that group", async () => {
        asOutsider();

        const res = await POST(...makePost(GROUP_ID, { tmdbId: 12345, title: "Oppenheimer" }));

        expect(res.status).toBe(403);
        expect(mockFilmUpsert).not.toHaveBeenCalled();
        expect(mockProposalCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when required fields are missing", async () => {
        asMember();

        const res = await POST(...makePost(GROUP_ID, { overview: "..." }));

        expect(res.status).toBe(400);
    });

    it("returns 400 when tmdbId is not a number", async () => {
        asMember();

        const res = await POST(...makePost(GROUP_ID, { tmdbId: "not-a-number", title: "Oppenheimer" }));

        expect(res.status).toBe(400);
        expect(mockFilmUpsert).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(...makePost(GROUP_ID, { tmdbId: 12345, title: "Oppenheimer" }));

        expect(res.status).toBe(401);
    });
});
