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

import { GET, POST } from "@/app/api/proposals/route";
import { getServerSession } from "next-auth";
import { group, memberUser, outsiderUser } from "../helpers/fixtures";

const asMember = () => {
    vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1", activeGroupId: "g1" },
    } as never);
    mockUserFindUnique.mockResolvedValue(memberUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

const asOutsider = () => {
    vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u2", activeGroupId: "g1" },
    } as never);
    mockUserFindUnique.mockResolvedValue(outsiderUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

describe("GET /api/proposals", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns proposals for the current user and active group", async () => {
        asMember();

        const fakeProposals = [{ id: "p1", filmId: "film1", film: {}, user: {} }];
        mockProposalFindMany.mockResolvedValue(fakeProposals);

        const req = new Request("http://localhost/api/proposals");
        const res = await GET(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(1);
        expect(mockProposalFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ userId: "u1", groupId: "g1" }) })
        );
    });

    it("returns all group proposals with scope=all", async () => {
        asMember();

        mockProposalFindMany.mockResolvedValue([]);

        const req = new Request("http://localhost/api/proposals?scope=all");
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(mockProposalFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { groupId: "g1" } })
        );
    });

    it("returns 403 when the user is not a member of the active group", async () => {
        asOutsider();

        const req = new Request("http://localhost/api/proposals?scope=all");
        const res = await GET(req);

        expect(res.status).toBe(403);
        expect(mockProposalFindMany).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const req = new Request("http://localhost/api/proposals");
        const res = await GET(req);

        expect(res.status).toBe(401);
    });
});

describe("POST /api/proposals", () => {
    const makeRequest = (body: object) =>
        new Request("http://localhost/api/proposals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

    beforeEach(() => vi.clearAllMocks());

    it("creates a proposal after upserting the film", async () => {
        asMember();

        mockFilmUpsert.mockResolvedValue({ id: "film1", tmdbId: 12345, title: "Oppenheimer" });
        mockProposalFindFirst.mockResolvedValue(null);
        mockProposalCreate.mockResolvedValue({ id: "p1", userId: "u1", filmId: "film1", groupId: "g1" });

        const res = await POST(makeRequest({ tmdbId: 12345, title: "Oppenheimer", overview: "...", posterPath: "/x.jpg" }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.id).toBe("p1");
        expect(mockFilmUpsert).toHaveBeenCalledOnce();
        expect(mockProposalCreate).toHaveBeenCalledOnce();
    });

    it("returns existing proposal without creating duplicate", async () => {
        asMember();

        mockFilmUpsert.mockResolvedValue({ id: "film1", tmdbId: 12345 });
        mockProposalFindFirst.mockResolvedValue({ id: "p1", userId: "u1", filmId: "film1" });

        const res = await POST(makeRequest({ tmdbId: 12345, title: "Oppenheimer", overview: "...", posterPath: "/x.jpg" }));

        expect(res.status).toBe(200);
        expect(mockProposalCreate).not.toHaveBeenCalled();
    });

    it("returns 403 when the user is not a member of the active group", async () => {
        asOutsider();

        const res = await POST(makeRequest({ tmdbId: 12345, title: "Oppenheimer" }));

        expect(res.status).toBe(403);
        expect(mockFilmUpsert).not.toHaveBeenCalled();
        expect(mockProposalCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when no active group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", activeGroupId: null },
        } as never);

        mockFilmUpsert.mockResolvedValue({ id: "film1", tmdbId: 12345 });
        mockProposalFindFirst.mockResolvedValue(null);

        const res = await POST(makeRequest({ tmdbId: 12345, title: "Oppenheimer", overview: "...", posterPath: "/x.jpg" }));

        expect(res.status).toBe(400);
    });

    it("returns 400 when required fields are missing", async () => {
        asMember();

        const res = await POST(makeRequest({ overview: "..." }));

        expect(res.status).toBe(400);
    });

    it("returns 400 when tmdbId is not a number", async () => {
        asMember();

        const res = await POST(makeRequest({ tmdbId: "not-a-number", title: "Oppenheimer" }));

        expect(res.status).toBe(400);
        expect(mockFilmUpsert).not.toHaveBeenCalled();
    });
});
