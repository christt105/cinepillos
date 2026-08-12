import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetImages, mockFindRemoteId, mockGetCharacters } = vi.hoisted(() => ({
    mockGetImages: vi.fn(),
    mockFindRemoteId: vi.fn(),
    mockGetCharacters: vi.fn(),
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

import { GET } from "@/app/api/tmdb/movies/[id]/avatar-options/route";
import { getServerSession } from "next-auth";

const context = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const makeRequest = (id: string, mediaType?: string) =>
    new Request(`http://localhost/api/tmdb/movies/${id}/avatar-options${mediaType ? `?mediaType=${mediaType}` : ""}`);

describe("GET /api/tmdb/movies/[id]/avatar-options", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetImages.mockResolvedValue({ posters: [] });
        mockFindRemoteId.mockResolvedValue(null);
        mockGetCharacters.mockResolvedValue([]);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await GET(makeRequest("550"), context("550"));

        expect(res.status).toBe(401);
        expect(mockGetImages).not.toHaveBeenCalled();
    });

    it("returns 400 for a non-numeric id", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        const res = await GET(makeRequest("not-a-number"), context("not-a-number"));

        expect(res.status).toBe(400);
        expect(mockGetImages).not.toHaveBeenCalled();
    });

    it("returns textless posters and TVDB character photos", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetImages.mockResolvedValue({
            posters: [
                { file_path: "/textless.jpg", iso_639_1: null },
                { file_path: "/with-text.jpg", iso_639_1: "en" },
            ],
        });
        mockFindRemoteId.mockResolvedValue({ type: "movie", id: 247 });
        mockGetCharacters.mockResolvedValue([
            { id: 1, name: "With Photo", image: "https://artworks.thetvdb.com/x.jpg", peopleType: "Actor" },
            { id: 2, name: "No Photo", image: "", peopleType: "Actor" },
            { id: 3, name: "Director", image: "https://artworks.thetvdb.com/y.jpg", peopleType: "Director" },
        ]);

        const res = await GET(makeRequest("550", "movie"), context("550"));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.posters).toEqual(["/textless.jpg"]);
        expect(data.cast).toEqual([{ id: 1, name: "With Photo", imageUrl: "https://artworks.thetvdb.com/x.jpg" }]);
        expect(mockGetImages).toHaveBeenCalledWith("movie", 550);
        expect(mockFindRemoteId).toHaveBeenCalledWith(550, "movie");
    });

    it("returns no cast when TVDB has no matching title", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockFindRemoteId.mockResolvedValue(null);

        const res = await GET(makeRequest("550"), context("550"));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.cast).toEqual([]);
        expect(mockGetCharacters).not.toHaveBeenCalled();
    });

    it("looks up a TV show when mediaType=tv", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        await GET(makeRequest("209867", "tv"), context("209867"));

        expect(mockGetImages).toHaveBeenCalledWith("tv", 209867);
        expect(mockFindRemoteId).toHaveBeenCalledWith(209867, "tv");
    });
});
