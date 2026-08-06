import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpdate, mockCandidateFindMany, mockUserFindUnique, mockGroupFindUnique } = vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockCandidateFindMany: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        meeting: { findUnique: mockFindUnique, update: mockUpdate },
        meetingCandidate: { findMany: mockCandidateFindMany },
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

import { PATCH } from "@/app/api/meetings/[id]/conclude/route";
import { getServerSession } from "next-auth";
import { group, memberUser, outsiderUser } from "../../helpers/fixtures";

const makeRequest = (meetingId: string) =>
    [
        new Request(`http://localhost/api/meetings/${meetingId}/conclude`, { method: "PATCH" }),
        { params: Promise.resolve({ id: meetingId }) } as never,
    ] as const;

const asRole = (role: string) => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    mockUserFindUnique.mockResolvedValue(memberUser(role));
    mockGroupFindUnique.mockResolvedValue(group);
};

describe("PATCH /api/meetings/[id]/conclude", () => {
    beforeEach(() => vi.clearAllMocks());

    it("concludes a meeting and selects the film with most votes as winner", async () => {
        asRole("OWNER");

        mockFindUnique.mockResolvedValue({ id: "m1", status: "VOTING", groupId: "g1" });
        mockCandidateFindMany.mockResolvedValue([
            { filmId: "film1", votes: [{ id: "v1" }, { id: "v2" }] },
            { filmId: "film2", votes: [{ id: "v3" }] },
        ]);
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
        asRole("OWNER");

        mockFindUnique.mockResolvedValue({ id: "m1", status: "VOTING", groupId: "g1" });
        mockCandidateFindMany.mockResolvedValue([
            { filmId: "film1", votes: [] },
            { filmId: "film2", votes: [] },
        ]);
        mockUpdate.mockResolvedValue({ id: "m1", status: "CONCLUDED", selectedFilmId: null });

        const [req, ctx] = makeRequest("m1");
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.winnerId).toBeNull();
    });

    it("returns 403 when requester is a member but not the owner", async () => {
        asRole("MEMBER");

        mockFindUnique.mockResolvedValue({ id: "m1", status: "VOTING", groupId: "g1" });

        const [req, ctx] = makeRequest("m1");
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(403);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("returns 403 when requester has no membership in the meeting's group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } } as never);
        mockUserFindUnique.mockResolvedValue(outsiderUser());
        mockGroupFindUnique.mockResolvedValue(group);

        mockFindUnique.mockResolvedValue({ id: "m1", status: "VOTING", groupId: "g1" });

        const [req, ctx] = makeRequest("m1");
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(403);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("returns 400 when meeting is not in voting phase", async () => {
        asRole("OWNER");

        mockFindUnique.mockResolvedValue({ id: "m1", status: "CONCLUDED", groupId: "g1" });

        const [req, ctx] = makeRequest("m1");
        const res = await PATCH(req, ctx);

        expect(res.status).toBe(400);
    });

    it("returns 404 when meeting does not exist", async () => {
        asRole("OWNER");

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
