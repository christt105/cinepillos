import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpdate } = vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        meeting: { findUnique: mockFindUnique, update: mockUpdate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { PATCH } from "@/app/api/meetings/[id]/conclude/route";
import { getServerSession } from "next-auth";

const makeRequest = (meetingId: string) =>
    [
        new Request(`http://localhost/api/meetings/${meetingId}/conclude`, { method: "PATCH" }),
        { params: Promise.resolve({ id: meetingId }) } as never,
    ] as const;

describe("PATCH /api/meetings/[id]/conclude", () => {
    beforeEach(() => vi.clearAllMocks());

    it("concludes a meeting and selects the film with most votes as winner", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        mockFindUnique.mockResolvedValue({
            id: "m1",
            status: "VOTING",
            candidates: [
                { filmId: "film1", votes: [{ id: "v1" }, { id: "v2" }] },
                { filmId: "film2", votes: [{ id: "v3" }] },
            ],
        });

        mockUpdate.mockResolvedValue({ id: "m1", status: "CONCLUDED", selectedFilmId: "film1" });

        const [req, ctx] = makeRequest("m1");
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.winnerId).toBe("film1");
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "CONCLUDED", selectedFilmId: "film1" }) })
        );
    });

    it("sets winnerId to null when no votes exist", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        mockFindUnique.mockResolvedValue({
            id: "m1",
            status: "VOTING",
            candidates: [
                { filmId: "film1", votes: [] },
                { filmId: "film2", votes: [] },
            ],
        });

        mockUpdate.mockResolvedValue({ id: "m1", status: "CONCLUDED", selectedFilmId: null });

        const [req, ctx] = makeRequest("m1");
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.winnerId).toBeNull();
    });

    it("returns 400 when meeting is not in voting phase", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        mockFindUnique.mockResolvedValue({ id: "m1", status: "CONCLUDED", candidates: [] });

        const [req, ctx] = makeRequest("m1");
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(400);
    });

    it("returns 404 when meeting does not exist", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        mockFindUnique.mockResolvedValue(null);

        const [req, ctx] = makeRequest("nonexistent");
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(404);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const [req, ctx] = makeRequest("m1");
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(401);
    });
});
