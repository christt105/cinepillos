import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockFindFirst, mockCreate, mockMeetingFindUnique, mockUserFindUnique, mockGroupFindUnique } =
    vi.hoisted(() => ({
        mockFindUnique: vi.fn(),
        mockFindFirst: vi.fn(),
        mockCreate: vi.fn(),
        mockMeetingFindUnique: vi.fn(),
        mockUserFindUnique: vi.fn(),
        mockGroupFindUnique: vi.fn(),
    }));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        meetingCandidate: { findUnique: mockFindUnique, findFirst: mockFindFirst, create: mockCreate },
        meeting: { findUnique: mockMeetingFindUnique },
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

import { POST } from "@/app/api/meetings/[id]/candidates/route";
import { getServerSession } from "next-auth";
import { group, memberUser, outsiderUser } from "../../helpers/fixtures";

const makeRequest = (meetingId: string, body: object) =>
    [
        new Request(`http://localhost/api/meetings/${meetingId}/candidates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: meetingId }) } as never,
    ] as const;

const asMember = () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    mockMeetingFindUnique.mockResolvedValue({ id: "m1", groupId: "g1", status: "VOTING" });
    mockUserFindUnique.mockResolvedValue(memberUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

describe("POST /api/meetings/[id]/candidates", () => {
    beforeEach(() => vi.clearAllMocks());

    it("adds a candidate when film is not yet in meeting and user has not proposed", async () => {
        asMember();

        mockFindUnique.mockResolvedValue(null);
        mockFindFirst.mockResolvedValue(null);
        mockCreate.mockResolvedValue({ id: "c1", meetingId: "m1", filmId: "film1", userId: "u1", film: {}, votes: [], user: {} });

        const [req, ctx] = makeRequest("m1", { filmId: "film1" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(200);
        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it("returns 400 when film is already proposed for this meeting", async () => {
        asMember();

        mockFindUnique.mockResolvedValue({ id: "existing-candidate" });

        const [req, ctx] = makeRequest("m1", { filmId: "film1" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/already proposed/i);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when user already proposed a film in this meeting", async () => {
        asMember();

        mockFindUnique.mockResolvedValue(null);
        mockFindFirst.mockResolvedValue({ id: "user-candidate" });

        const [req, ctx] = makeRequest("m1", { filmId: "film2" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/only propose one/i);
    });

    it("returns 400 when filmId is missing", async () => {
        asMember();

        const [req, ctx] = makeRequest("m1", {});
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
    });

    it("returns 403 when the user is not a member of the meeting's group", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } } as never);
        mockMeetingFindUnique.mockResolvedValue({ id: "m1", groupId: "g1", status: "VOTING" });
        mockUserFindUnique.mockResolvedValue(outsiderUser());
        mockGroupFindUnique.mockResolvedValue(group);

        const [req, ctx] = makeRequest("m1", { filmId: "film1" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(403);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 404 when the meeting does not exist", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockMeetingFindUnique.mockResolvedValue(null);

        const [req, ctx] = makeRequest("nonexistent", { filmId: "film1" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(404);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const [req, ctx] = makeRequest("m1", { filmId: "film1" });
        const res = await POST(req, ctx);

        expect(res.status).toBe(401);
    });
});
