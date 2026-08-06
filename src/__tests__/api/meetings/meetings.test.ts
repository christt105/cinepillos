import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindMany, mockCreate, mockUserFindUnique, mockGroupFindUnique } = vi.hoisted(() => ({
    mockFindMany: vi.fn(),
    mockCreate: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        meeting: { findMany: mockFindMany, create: mockCreate },
        user: { findUnique: mockUserFindUnique },
        group: { findUnique: mockGroupFindUnique },
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
import { group, memberUser, outsiderUser } from "../../helpers/fixtures";

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const asMember = () => {
    vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u1", activeGroupId: "g1" },
    } as never);
    mockUserFindUnique.mockResolvedValue(memberUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

const asOutsider = () => {
    vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "u2", activeGroupId: "g1" },
    } as never);
    mockUserFindUnique.mockResolvedValue(outsiderUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

describe("GET /api/meetings", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns meetings for the active group", async () => {
        asMember();

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

    it("returns 403 when the user is not a member of the active group", async () => {
        asOutsider();

        const res = await GET();

        expect(res.status).toBe(403);
        expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await GET();

        expect(res.status).toBe(401);
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
        asMember();

        const date = FUTURE_DATE;
        mockCreate.mockResolvedValue({ id: "m2", date, status: "VOTING", groupId: "g1" });

        const res = await POST(makeRequest({ date }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.id).toBe("m2");
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ groupId: "g1", status: "VOTING" }) })
        );
    });

    it("returns 403 when the user is not a member of the active group", async () => {
        asOutsider();

        const res = await POST(makeRequest({ date: FUTURE_DATE }));

        expect(res.status).toBe(403);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when date is missing", async () => {
        asMember();

        const res = await POST(makeRequest({}));

        expect(res.status).toBe(400);
    });

    it("returns 400 when the date is not a real date", async () => {
        asMember();

        const res = await POST(makeRequest({ date: "next friday" }));

        expect(res.status).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when the date is in the past", async () => {
        asMember();

        const res = await POST(makeRequest({ date: "2020-01-01T20:00:00Z" }));

        expect(res.status).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when user has no active group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", activeGroupId: null },
        } as never);

        const res = await POST(makeRequest({ date: FUTURE_DATE }));

        expect(res.status).toBe(400);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makeRequest({ date: FUTURE_DATE }));

        expect(res.status).toBe(401);
    });
});
