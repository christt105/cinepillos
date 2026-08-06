import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindMany, mockCreate } = vi.hoisted(() => ({
    mockFindMany: vi.fn(),
    mockCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        meeting: { findMany: mockFindMany, create: mockCreate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { GET, POST } from "@/app/api/meetings/route";
import { getServerSession } from "next-auth";

describe("GET /api/meetings", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns meetings for the active group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", activeGroupId: "g1" },
        } as never);

        const fakeMeetings = [{ id: "m1", date: new Date().toISOString(), status: "VOTING", candidates: [] }];
        mockFindMany.mockResolvedValue(fakeMeetings);

        const res = await GET();

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe("m1");
    });

    it("returns empty array when user has no active group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", activeGroupId: null },
        } as never);

        const res = await GET();

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual([]);
        expect(mockFindMany).not.toHaveBeenCalled();
    });
});

describe("POST /api/meetings", () => {
    const makeRequest = (body: object) =>
        new Request("http://localhost/api/meetings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

    beforeEach(() => vi.clearAllMocks());

    it("creates a meeting for the active group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", activeGroupId: "g1" },
        } as never);

        const date = new Date("2026-09-01T20:00:00Z").toISOString();
        mockCreate.mockResolvedValue({ id: "m2", date, status: "VOTING", groupId: "g1" });

        const res = await POST(makeRequest({ date }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.id).toBe("m2");
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ groupId: "g1", status: "VOTING" }) })
        );
    });

    it("returns 400 when date is missing", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", activeGroupId: "g1" },
        } as never);

        const res = await POST(makeRequest({}));

        expect(res.status).toBe(400);
    });

    it("returns 400 when user has no active group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", activeGroupId: null },
        } as never);

        const res = await POST(makeRequest({ date: new Date().toISOString() }));

        expect(res.status).toBe(400);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makeRequest({ date: new Date().toISOString() }));

        expect(res.status).toBe(401);
    });
});
