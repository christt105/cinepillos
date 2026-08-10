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

import { GET, POST } from "@/app/api/groups/[groupId]/meetings/route";
import { getServerSession } from "next-auth";
import { GROUP_ID, group, memberUser, outsiderUser } from "../../helpers/fixtures";

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const makeGet = (groupId: string) =>
    [
        new Request(`http://localhost/api/groups/${groupId}/meetings`),
        { params: Promise.resolve({ groupId }) } as never,
    ] as const;

const makePost = (groupId: string, body: object) =>
    [
        new Request(`http://localhost/api/groups/${groupId}/meetings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ groupId }) } as never,
    ] as const;

const asMember = () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    mockUserFindUnique.mockResolvedValue(memberUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

const asOutsider = () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } } as never);
    mockUserFindUnique.mockResolvedValue(outsiderUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

describe("GET /api/groups/[groupId]/meetings", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns the meetings of the group in the URL", async () => {
        asMember();

        mockFindMany.mockResolvedValue([{ id: "m1", date: new Date().toISOString(), status: "VOTING", candidates: [] }]);

        const [req, ctx] = makeGet(GROUP_ID);
        const res = await GET(req, ctx);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(1);
        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ groupId: GROUP_ID }) })
        );
    });

    it("returns 403 when the user is not a member of that group", async () => {
        asOutsider();

        const [req, ctx] = makeGet(GROUP_ID);
        const res = await GET(req, ctx);

        expect(res.status).toBe(403);
        expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("returns 403 for a group that does not exist", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockUserFindUnique.mockResolvedValue(memberUser());
        mockGroupFindUnique.mockResolvedValue(null);

        const [req, ctx] = makeGet("ghost");
        const res = await GET(req, ctx);

        expect(res.status).toBe(403);
        expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const [req, ctx] = makeGet(GROUP_ID);
        const res = await GET(req, ctx);

        expect(res.status).toBe(401);
        expect(mockFindMany).not.toHaveBeenCalled();
    });
});

describe("POST /api/groups/[groupId]/meetings", () => {
    beforeEach(() => vi.clearAllMocks());

    it("creates a meeting in the group from the URL", async () => {
        asMember();

        mockCreate.mockResolvedValue({ id: "m2", date: FUTURE_DATE, status: "VOTING", groupId: GROUP_ID });

        const [req, ctx] = makePost(GROUP_ID, { date: FUTURE_DATE });
        const res = await POST(req, ctx);

        expect(res.status).toBe(200);
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ groupId: GROUP_ID, status: "VOTING" }) })
        );
    });

    it("returns 403 when the user is not a member of that group", async () => {
        asOutsider();

        const [req, ctx] = makePost(GROUP_ID, { date: FUTURE_DATE });
        const res = await POST(req, ctx);

        expect(res.status).toBe(403);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("creates an undated meeting in PLANNING when no date is given", async () => {
        asMember();

        mockCreate.mockResolvedValue({ id: "m3", date: null, status: "PLANNING", groupId: GROUP_ID });

        const [req, ctx] = makePost(GROUP_ID, {});
        const res = await POST(req, ctx);

        expect(res.status).toBe(200);
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ groupId: GROUP_ID, status: "PLANNING", date: null }),
            })
        );
    });

    it("returns 400 when the date is not a real date", async () => {
        asMember();

        const [req, ctx] = makePost(GROUP_ID, { date: "next friday" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when the date is in the past", async () => {
        asMember();

        const [req, ctx] = makePost(GROUP_ID, { date: "2020-01-01T20:00:00Z" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const [req, ctx] = makePost(GROUP_ID, { date: FUTURE_DATE });
        const res = await POST(req, ctx);

        expect(res.status).toBe(401);
    });
});
