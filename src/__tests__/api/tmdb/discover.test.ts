import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDiscoverMovies } = vi.hoisted(() => ({
    mockDiscoverMovies: vi.fn(),
}));

vi.mock("@/lib/tmdb", () => ({
    tmdb: {
        discoverMovies: mockDiscoverMovies,
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { GET } from "@/app/api/tmdb/discover/route";
import { getServerSession } from "next-auth";

const makeRequest = (genre?: string, locale?: string) => {
    const params = new URLSearchParams();
    if (genre) params.set("genre", genre);
    return new Request(`http://localhost/api/tmdb/discover?${params.toString()}`, {
        headers: locale ? { cookie: `locale=${locale}` } : undefined,
    });
};

describe("GET /api/tmdb/discover", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await GET(makeRequest("28"));

        expect(res.status).toBe(401);
        expect(mockDiscoverMovies).not.toHaveBeenCalled();
    });

    it("returns 400 when the genre is missing or not numeric", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        expect((await GET(makeRequest())).status).toBe(400);
        expect((await GET(makeRequest("action"))).status).toBe(400);
        expect(mockDiscoverMovies).not.toHaveBeenCalled();
    });

    it("browses movies by genre when authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockDiscoverMovies.mockResolvedValue({ results: [{ id: 1, title: "Mad Max" }] });

        const res = await GET(makeRequest("28", "en"));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.results[0].title).toBe("Mad Max");
        expect(mockDiscoverMovies).toHaveBeenCalledWith(28, "en");
    });
});
