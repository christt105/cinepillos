import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockFindFirst, mockCreate } = vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockFindFirst: vi.fn(),
    mockCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        meetingCandidate: { findUnique: mockFindUnique, findFirst: mockFindFirst, create: mockCreate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { POST } from "@/app/api/meetings/[id]/candidates/route";
import { getServerSession } from "next-auth";

const makeRequest = (meetingId: string, body: object) =>
    [
        new Request(`http://localhost/api/meetings/${meetingId}/candidates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: meetingId }) } as never,
    ] as const;

describe("POST /api/meetings/[id]/candidates", () => {
    beforeEach(() => vi.clearAllMocks());

    it("adds a candidate when film is not yet in meeting and user has not proposed", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1" },
        } as never);

        mockFindUnique.mockResolvedValue(null);
        mockFindFirst.mockResolvedValue(null);
        mockCreate.mockResolvedValue({ id: "c1", meetingId: "m1", filmId: "film1", userId: "u1", film: {}, votes: [], user: {} });

        const [req, ctx] = makeRequest("m1", { filmId: "film1" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(200);
        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it("returns 400 when film is already proposed for this meeting", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1" },
        } as never);

        mockFindUnique.mockResolvedValue({ id: "existing-candidate" });

        const [req, ctx] = makeRequest("m1", { filmId: "film1" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/already proposed/i);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when user already proposed a film in this meeting", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1" },
        } as never);

        mockFindUnique.mockResolvedValue(null);
        mockFindFirst.mockResolvedValue({ id: "user-candidate" });

        const [req, ctx] = makeRequest("m1", { filmId: "film2" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/only propose one/i);
    });

    it("returns 400 when filmId is missing", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1" },
        } as never);

        const [req, ctx] = makeRequest("m1", {});
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const [req, ctx] = makeRequest("m1", { filmId: "film1" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(401);
    });
});
