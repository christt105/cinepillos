import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique, mockVoteFindUnique, mockVoteCreate, mockVoteDelete } = vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockVoteFindUnique: vi.fn(),
    mockVoteCreate: vi.fn(),
    mockVoteDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mockUserFindUnique },
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

const makeRequest = (body: object) =>
    new Request("http://localhost/api/meetings/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

describe("POST /api/meetings/vote", () => {
    beforeEach(() => vi.clearAllMocks());

    it("registers a vote when user has not voted yet", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", email: "u1@example.com" },
        } as never);

        mockUserFindUnique.mockResolvedValue({ id: "u1", email: "u1@example.com" });
        mockVoteFindUnique.mockResolvedValue(null);
        mockVoteCreate.mockResolvedValue({ id: "v1", candidateId: "c1", userId: "u1" });

        const res = await POST(makeRequest({ candidateId: "c1" }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.voted).toBe(true);
        expect(mockVoteCreate).toHaveBeenCalledOnce();
    });

    it("removes vote on second call (toggle)", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "u1", email: "u1@example.com" },
        } as never);

        mockUserFindUnique.mockResolvedValue({ id: "u1", email: "u1@example.com" });
        mockVoteFindUnique.mockResolvedValue({ id: "v1", candidateId: "c1", userId: "u1" });
        mockVoteDelete.mockResolvedValue({ id: "v1" });

        const res = await POST(makeRequest({ candidateId: "c1" }));

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.voted).toBe(false);
        expect(mockVoteDelete).toHaveBeenCalledOnce();
        expect(mockVoteCreate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(makeRequest({ candidateId: "c1" }));

        expect(res.status).toBe(401);
    });
});
