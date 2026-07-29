import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSearchMovies, mockGetTrending } = vi.hoisted(() => ({
    mockSearchMovies: vi.fn(),
    mockGetTrending: vi.fn(),
}));

vi.mock("@/lib/tmdb", () => ({
    tmdb: {
        searchMovies: mockSearchMovies,
        getTrending: mockGetTrending,
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { GET } from "@/app/api/tmdb/search/route";
import { getServerSession } from "next-auth";

const makeRequest = (query?: string) =>
    new Request(`http://localhost/api/tmdb/search${query ? `?query=${query}` : ""}`);

describe("GET /api/tmdb/search", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await GET(makeRequest("dune"));

        expect(res.status).toBe(401);
        expect(mockSearchMovies).not.toHaveBeenCalled();
        expect(mockGetTrending).not.toHaveBeenCalled();
    });

    it("searches movies when authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockSearchMovies.mockResolvedValue({ results: [{ id: 1, title: "Dune" }] });

        const res = await GET(makeRequest("dune"));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.results[0].title).toBe("Dune");
        expect(mockSearchMovies).toHaveBeenCalledWith("dune");
    });

    it("falls back to trending without a query", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetTrending.mockResolvedValue({ results: [] });

        const res = await GET(makeRequest());

        expect(res.status).toBe(200);
        expect(mockGetTrending).toHaveBeenCalledOnce();
    });
});
