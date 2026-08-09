import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserUpdate, mockGetMovieImages, mockGetMovieCredits } = vi.hoisted(() => ({
    mockUserUpdate: vi.fn(),
    mockGetMovieImages: vi.fn(),
    mockGetMovieCredits: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { update: mockUserUpdate },
    },
}));

vi.mock("@/lib/tmdb", () => ({
    tmdb: {
        getMovieImages: mockGetMovieImages,
        getMovieCredits: mockGetMovieCredits,
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
        mockGetMovieImages.mockResolvedValue({
            posters: [{ file_path: "/poster.jpg", iso_639_1: null }],
        });
        mockUserUpdate.mockResolvedValue({ id: "u1", image: "/poster.jpg" });

        const res = await POST(makePost("u1", { kind: "poster", tmdbId: 550, path: "/poster.jpg" }), context("u1"));

        expect(res.status).toBe(200);
        expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { image: "/poster.jpg" } });
    });

    it("refuses a poster path that TMDB does not actually have for that movie", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetMovieImages.mockResolvedValue({
            posters: [{ file_path: "/real.jpg", iso_639_1: null }],
        });

        const res = await POST(
            makePost("u1", { kind: "poster", tmdbId: 550, path: "https://evil.example/x.jpg" }),
            context("u1")
        );

        expect(res.status).toBe(400);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("resolves a cast photo from the person's id rather than trusting a path", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetMovieCredits.mockResolvedValue({
            cast: [{ id: 42, name: "Actor", profile_path: "/actor.jpg" }],
        });
        mockUserUpdate.mockResolvedValue({ id: "u1", image: "/actor.jpg" });

        const res = await POST(makePost("u1", { kind: "cast", tmdbId: 550, personId: 42 }), context("u1"));

        expect(res.status).toBe(200);
        expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { image: "/actor.jpg" } });
    });

    it("refuses a personId that is not in that movie's cast", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetMovieCredits.mockResolvedValue({ cast: [] });

        const res = await POST(makePost("u1", { kind: "cast", tmdbId: 550, personId: 999 }), context("u1"));

        expect(res.status).toBe(400);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("refuses to set another user's avatar", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        const res = await POST(makePost("u2", { kind: "poster", tmdbId: 550, path: "/x.jpg" }), context("u2"));

        expect(res.status).toBe(403);
        expect(mockGetMovieImages).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makePost("u1", { kind: "poster", tmdbId: 550, path: "/x.jpg" }), context("u1"));

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
