import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserUpdate, mockGetImages, mockFindRemoteId, mockGetCharacters } = vi.hoisted(() => ({
    mockUserUpdate: vi.fn(),
    mockGetImages: vi.fn(),
    mockFindRemoteId: vi.fn(),
    mockGetCharacters: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { update: mockUserUpdate },
    },
}));

vi.mock("@/lib/tmdb", () => ({
    tmdb: {
        getImages: mockGetImages,
    },
}));

vi.mock("@/lib/tvdb", () => ({
    tvdb: {
        findRemoteId: mockFindRemoteId,
        getCharacters: mockGetCharacters,
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { POST, DELETE } from "@/app/api/users/[id]/avatar/route";
import { getServerSession } from "next-auth";

const context = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

const makePost = (id: string, body: object) =>
    new Request(`http://localhost/api/users/${id}/avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

const makeDelete = (id: string) =>
    new Request(`http://localhost/api/users/${id}/avatar`, { method: "DELETE" });

describe("POST /api/users/[id]/avatar", () => {
    beforeEach(() => vi.clearAllMocks());

    it("stores a poster path that is present in a fresh TMDB response", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetImages.mockResolvedValue({
            posters: [{ file_path: "/poster.jpg", iso_639_1: null }],
        });
        mockUserUpdate.mockResolvedValue({ id: "u1", image: "/poster.jpg" });

        const res = await POST(
            makePost("u1", { kind: "poster", tmdbId: 550, mediaType: "movie", path: "/poster.jpg" }),
            context("u1")
        );

        expect(res.status).toBe(200);
        expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { image: "/poster.jpg" } });
        expect(mockGetImages).toHaveBeenCalledWith("movie", 550);
    });

    it("refuses a poster path that TMDB does not actually have for that title", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetImages.mockResolvedValue({
            posters: [{ file_path: "/real.jpg", iso_639_1: null }],
        });

        const res = await POST(
            makePost("u1", { kind: "poster", tmdbId: 550, mediaType: "movie", path: "https://evil.example/x.jpg" }),
            context("u1")
        );

        expect(res.status).toBe(400);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("resolves a character photo from the TVDB character's id rather than trusting a URL", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockFindRemoteId.mockResolvedValue({ type: "movie", id: 247 });
        mockGetCharacters.mockResolvedValue([
            { id: 42, name: "Character", image: "https://artworks.thetvdb.com/x.jpg", peopleType: "Actor" },
        ]);
        mockUserUpdate.mockResolvedValue({ id: "u1", image: "https://artworks.thetvdb.com/x.jpg" });

        const res = await POST(
            makePost("u1", { kind: "cast", tmdbId: 550, mediaType: "movie", characterId: 42 }),
            context("u1")
        );

        expect(res.status).toBe(200);
        expect(mockUserUpdate).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { image: "https://artworks.thetvdb.com/x.jpg" },
        });
        expect(mockFindRemoteId).toHaveBeenCalledWith(550, "movie");
    });

    it("refuses a characterId that is not in that title's cast", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockFindRemoteId.mockResolvedValue({ type: "movie", id: 247 });
        mockGetCharacters.mockResolvedValue([]);

        const res = await POST(
            makePost("u1", { kind: "cast", tmdbId: 550, mediaType: "movie", characterId: 999 }),
            context("u1")
        );

        expect(res.status).toBe(400);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("refuses a cast selection when TVDB has no matching title", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockFindRemoteId.mockResolvedValue(null);

        const res = await POST(
            makePost("u1", { kind: "cast", tmdbId: 550, mediaType: "movie", characterId: 42 }),
            context("u1")
        );

        expect(res.status).toBe(400);
        expect(mockUserUpdate).not.toHaveBeenCalled();
        expect(mockGetCharacters).not.toHaveBeenCalled();
    });

    it("refuses to set another user's avatar", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        const res = await POST(
            makePost("u2", { kind: "poster", tmdbId: 550, mediaType: "movie", path: "/x.jpg" }),
            context("u2")
        );

        expect(res.status).toBe(403);
        expect(mockGetImages).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(
            makePost("u1", { kind: "poster", tmdbId: 550, mediaType: "movie", path: "/x.jpg" }),
            context("u1")
        );

        expect(res.status).toBe(401);
    });
});

describe("DELETE /api/users/[id]/avatar", () => {
    beforeEach(() => vi.clearAllMocks());

    it("resets the avatar to null", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockUserUpdate.mockResolvedValue({ id: "u1", image: null });

        const res = await DELETE(makeDelete("u1"), context("u1"));

        expect(res.status).toBe(200);
        expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { image: null } });
    });

    it("refuses to reset another user's avatar", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        const res = await DELETE(makeDelete("u2"), context("u2"));

        expect(res.status).toBe(403);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });
});
