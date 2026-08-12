import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSearchMovies, mockSearchMulti, mockGetTrending } = vi.hoisted(() => ({
    mockSearchMovies: vi.fn(),
    mockSearchMulti: vi.fn(),
    mockGetTrending: vi.fn(),
}));

vi.mock("@/lib/tmdb", () => ({
    tmdb: {
        searchMovies: mockSearchMovies,
        searchMulti: mockSearchMulti,
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

const makeRequest = (query?: string, media?: string, locale?: string) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (media) params.set("media", media);
    const qs = params.toString();
    return new Request(`http://localhost/api/tmdb/search${qs ? `?${qs}` : ""}`, {
        headers: locale ? { cookie: `locale=${locale}` } : undefined,
    });
};

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
        expect(mockSearchMovies).toHaveBeenCalledWith("dune", "es");
    });

    it("falls back to trending without a query", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetTrending.mockResolvedValue({ results: [] });

        const res = await GET(makeRequest());

        expect(res.status).toBe(200);
        expect(mockGetTrending).toHaveBeenCalledWith("es");
    });

    it("searches movies and TV shows when media=multi", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockSearchMulti.mockResolvedValue({ results: [{ id: 1, media_type: "tv", name: "Frieren" }] });

        const res = await GET(makeRequest("frieren", "multi"));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.results[0].name).toBe("Frieren");
        expect(mockSearchMulti).toHaveBeenCalledWith("frieren", "es");
        expect(mockSearchMovies).not.toHaveBeenCalled();
    });

    it("asks TMDB for the language in the locale cookie", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockSearchMovies.mockResolvedValue({ results: [] });

        await GET(makeRequest("dune", undefined, "en"));

        expect(mockSearchMovies).toHaveBeenCalledWith("dune", "en");
    });

    it("falls back to the default language for an unknown cookie", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockSearchMovies.mockResolvedValue({ results: [] });

        await GET(makeRequest("dune", undefined, "klingon"));

        expect(mockSearchMovies).toHaveBeenCalledWith("dune", "es");
    });
});
