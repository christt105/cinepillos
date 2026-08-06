import { describe, it, expect, vi, beforeEach } from "vitest";

const {
    mockUserFindUnique,
    mockGroupFindUnique,
    mockCandidateFindUnique,
    mockVoteFindUnique,
    mockVoteCreate,
    mockVoteDelete,
} = vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockGroupFindUnique: vi.fn(),
    mockCandidateFindUnique: vi.fn(),
    mockVoteFindUnique: vi.fn(),
    mockVoteCreate: vi.fn(),
    mockVoteDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mockUserFindUnique },
        group: { findUnique: mockGroupFindUnique },
        meetingCandidate: { findUnique: mockCandidateFindUnique },
        vote: { findUnique: mockVoteFindUnique, create: mockVoteCreate, delete: mockVoteDelete },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

import { POST } from "@/app/api/meetings/vote/route";
import { getServerSession } from "next-auth";
import { group, memberUser, outsiderUser } from "../../helpers/fixtures";

const makeRequest = (body: object) =>
    new Request("http://localhost/api/meetings/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

const candidateInGroup = {
    id: "c1",
    meetingId: "m1",
    filmId: "film1",
    userId: "u9",
    meeting: { id: "m1", groupId: "g1", status: "VOTING" },
};

const asMember = () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    mockCandidateFindUnique.mockResolvedValue(candidateInGroup);
    mockUserFindUnique.mockResolvedValue(memberUser());
    mockGroupFindUnique.mockResolvedValue(group);
};

describe("POST /api/meetings/vote", () => {
    beforeEach(() => vi.clearAllMocks());

    it("registers a vote when user has not voted yet", async () => {
        asMember();

        mockVoteFindUnique.mockResolvedValue(null);
        mockVoteCreate.mockResolvedValue({ id: "v1", candidateId: "c1", userId: "u1" });

        const res = await POST(makeRequest({ candidateId: "c1" }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.voted).toBe(true);
        expect(mockVoteCreate).toHaveBeenCalledOnce();
    });

    it("removes vote on second call (toggle)", async () => {
        asMember();

        mockVoteFindUnique.mockResolvedValue({ id: "v1", candidateId: "c1", userId: "u1" });
        mockVoteDelete.mockResolvedValue({ id: "v1" });

        const res = await POST(makeRequest({ candidateId: "c1" }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.voted).toBe(false);
        expect(mockVoteDelete).toHaveBeenCalledOnce();
        expect(mockVoteCreate).not.toHaveBeenCalled();
    });

    it("identifies the voter by session id, not by email", async () => {
        asMember();

        mockVoteFindUnique.mockResolvedValue(null);
        mockVoteCreate.mockResolvedValue({ id: "v1", candidateId: "c1", userId: "u1" });

        await POST(makeRequest({ candidateId: "c1" }));

        expect(mockUserFindUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "u1" } })
        );
        expect(mockVoteCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ userId: "u1" }) })
        );
    });

    it("returns 403 when the candidate belongs to a group the user is not in", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u2" } } as never);
        mockCandidateFindUnique.mockResolvedValue(candidateInGroup);
        mockUserFindUnique.mockResolvedValue(outsiderUser());
        mockGroupFindUnique.mockResolvedValue(group);

        const res = await POST(makeRequest({ candidateId: "c1" }));

        expect(res.status).toBe(403);
        expect(mockVoteCreate).not.toHaveBeenCalled();
    });

    it("returns 404 when the candidate does not exist", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
        mockCandidateFindUnique.mockResolvedValue(null);

        const res = await POST(makeRequest({ candidateId: "ghost" }));

        expect(res.status).toBe(404);
        expect(mockVoteCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when candidateId is missing", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);

        const res = await POST(makeRequest({}));

        expect(res.status).toBe(400);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makeRequest({ candidateId: "c1" }));

        expect(res.status).toBe(401);
    });
});
