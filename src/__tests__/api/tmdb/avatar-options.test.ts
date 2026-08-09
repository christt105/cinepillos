import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetMovieImages, mockGetMovieCredits } = vi.hoisted(() => ({
    mockGetMovieImages: vi.fn(),
    mockGetMovieCredits: vi.fn(),
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

import { GET } from "@/app/api/tmdb/movies/[id]/avatar-options/route";
import { getServerSession } from "next-auth";

const context = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const makeRequest = (id: string) => new Request(`http://localhost/api/tmdb/movies/${id}/avatar-options`);

describe("GET /api/tmdb/movies/[id]/avatar-options", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await GET(makeRequest("550"), context("550"));

        expect(res.status).toBe(401);
        expect(mockGetMovieImages).not.toHaveBeenCalled();
    });

    it("returns 400 for a non-numeric id", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        const res = await GET(makeRequest("not-a-number"), context("not-a-number"));

        expect(res.status).toBe(400);
        expect(mockGetMovieImages).not.toHaveBeenCalled();
    });

    it("returns textless posters and cast members with a photo", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetMovieImages.mockResolvedValue({
            posters: [
                { file_path: "/textless.jpg", iso_639_1: null },
                { file_path: "/with-text.jpg", iso_639_1: "en" },
            ],
        });
        mockGetMovieCredits.mockResolvedValue({
            cast: [
                { id: 1, name: "With Photo", profile_path: "/actor.jpg" },
                { id: 2, name: "No Photo", profile_path: null },
            ],
        });

        const res = await GET(makeRequest("550"), context("550"));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.posters).toEqual(["/textless.jpg"]);
        expect(data.cast).toEqual([{ id: 1, name: "With Photo", profilePath: "/actor.jpg" }]);
    });
});
