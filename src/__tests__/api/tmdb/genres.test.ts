import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetGenres } = vi.hoisted(() => ({
    mockGetGenres: vi.fn(),
}));

vi.mock("@/lib/tmdb", () => ({
    tmdb: {
        getGenres: mockGetGenres,
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { GET } from "@/app/api/tmdb/genres/route";
import { getServerSession } from "next-auth";

const makeRequest = (locale?: string) =>
    new Request("http://localhost/api/tmdb/genres", {
        headers: locale ? { cookie: `locale=${locale}` } : undefined,
    });

describe("GET /api/tmdb/genres", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await GET(makeRequest());

        expect(res.status).toBe(401);
        expect(mockGetGenres).not.toHaveBeenCalled();
    });

    it("returns the genre list when authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockGetGenres.mockResolvedValue({ genres: [{ id: 28, name: "Action" }] });

        const res = await GET(makeRequest("en"));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual([{ id: 28, name: "Action" }]);
        expect(mockGetGenres).toHaveBeenCalledWith("en");
    });
});
