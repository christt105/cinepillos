import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSimilarMovies } = vi.hoisted(() => ({
    mockGetSimilarMovies: vi.fn(),
}));

vi.mock("@/lib/tmdb", () => ({
    tmdb: {
        getSimilarMovies: mockGetSimilarMovies,
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { GET } from "@/app/api/tmdb/movies/[id]/similar/route";
import { getServerSession } from "next-auth";

const context = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const makeRequest = (id: string, locale?: string) =>
    new Request(`http://localhost/api/tmdb/movies/${id}/similar`, {
        headers: locale ? { cookie: `locale=${locale}` } : undefined,
    });

describe("GET /api/tmdb/movies/[id]/similar", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await GET(makeRequest("550"), context("550"));

        expect(res.status).toBe(401);
        expect(mockGetSimilarMovies).not.toHaveBeenCalled();
    });

    it("returns 400 for a non-numeric id", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        const res = await GET(makeRequest("not-a-number"), context("not-a-number"));

        expect(res.status).toBe(400);
        expect(mockGetSimilarMovies).not.toHaveBeenCalled();
    });

    it("returns similar films when authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetSimilarMovies.mockResolvedValue({ results: [{ id: 807, title: "Se7en" }] });

        const res = await GET(makeRequest("550", "en"), context("550"));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.results[0].title).toBe("Se7en");
        expect(mockGetSimilarMovies).toHaveBeenCalledWith(550, "en");
    });
});
