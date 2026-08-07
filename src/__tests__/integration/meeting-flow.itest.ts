import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", async () => {
    const { getSession } = await import("./session");
    return { getServerSession: async () => getSession() };
});

vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import type { Group, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { api } from "./routes";
import { signIn, signOut } from "./session";
import {
    createCandidate,
    createFilm,
    createGroup,
    createMeeting,
    createUser,
    createVote,
    resetDatabase,
} from "./factories";

let owner: User;
let member: User;
let group: Group;

beforeEach(async () => {
    await resetDatabase();
    signOut();

    owner = await createUser({ name: "Owner" });
    member = await createUser({ name: "Member" });
    group = await createGroup([
        { user: owner, role: "OWNER" },
        { user: member, role: "MEMBER" },
    ]);
});

describe("PATCH /api/groups/[groupId]/meetings/[id]/conclude", () => {
    it("refuses a plain member of the group", async () => {
        const meeting = await createMeeting(group);
        signIn(member);

        const res = await api.conclude(group.id, meeting.id);

        expect(res.status).toBe(403);
        const stored = await prisma.meeting.findUniqueOrThrow({ where: { id: meeting.id } });
        expect(stored.status).toBe("VOTING");
    });

    it("picks the candidate with the most votes", async () => {
        const meeting = await createMeeting(group);
        const losing = await createCandidate(meeting, owner);
        const winning = await createCandidate(meeting, member);
        const voter = await createUser();

        await createVote(losing, owner);
        await createVote(winning, member);
        await createVote(winning, voter);

        signIn(owner);
        const res = await api.conclude(group.id, meeting.id);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, winnerId: winning.filmId });

        const stored = await prisma.meeting.findUniqueOrThrow({ where: { id: meeting.id } });
        expect(stored.status).toBe("CONCLUDED");
        expect(stored.selectedFilmId).toBe(winning.filmId);
    });

    it("ignores votes cast on candidates of another meeting", async () => {
        const meeting = await createMeeting(group);
        const otherMeeting = await createMeeting(group);
        const candidate = await createCandidate(meeting, owner);
        const decoy = await createCandidate(otherMeeting, member);

        await createVote(decoy, owner);
        await createVote(decoy, member);
        await createVote(candidate, member);

        signIn(owner);
        const res = await api.conclude(group.id, meeting.id);

        expect(await res.json()).toEqual({ success: true, winnerId: candidate.filmId });
    });

    it("concludes with no winner when nobody voted", async () => {
        const meeting = await createMeeting(group);
        await createCandidate(meeting, owner);

        signIn(owner);
        const res = await api.conclude(group.id, meeting.id);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, winnerId: null });

        const stored = await prisma.meeting.findUniqueOrThrow({ where: { id: meeting.id } });
        expect(stored.selectedFilmId).toBeNull();
    });

    it("refuses to conclude a meeting twice", async () => {
        const meeting = await createMeeting(group, { status: "CONCLUDED" });
        signIn(owner);

        const res = await api.conclude(group.id, meeting.id);

        expect(res.status).toBe(400);
    });

    it("answers 404 for a meeting that does not exist", async () => {
        signIn(owner);

        const res = await api.conclude(group.id, "missing-meeting");

        expect(res.status).toBe(404);
    });
});

describe("candidates", () => {
    it("adds a candidate proposed by the caller", async () => {
        const meeting = await createMeeting(group);
        const film = await createFilm();
        signIn(member);

        const res = await api.addCandidate(group.id, meeting.id, { filmId: film.id });

        expect(res.status).toBe(200);
        const stored = await prisma.meetingCandidate.findFirstOrThrow({
            where: { meetingId: meeting.id },
        });
        expect(stored.userId).toBe(member.id);
        expect(stored.filmId).toBe(film.id);
    });

    it("allows only one candidate per user and meeting", async () => {
        const meeting = await createMeeting(group);
        await createCandidate(meeting, member);
        const film = await createFilm();
        signIn(member);

        const res = await api.addCandidate(group.id, meeting.id, { filmId: film.id });

        expect(res.status).toBe(400);
        expect(await prisma.meetingCandidate.count({ where: { meetingId: meeting.id } })).toBe(1);
    });

    it("rejects a film another member already proposed", async () => {
        const meeting = await createMeeting(group);
        const existing = await createCandidate(meeting, owner);
        signIn(member);

        const res = await api.addCandidate(group.id, meeting.id, { filmId: existing.filmId });

        expect(res.status).toBe(400);
        expect(await prisma.meetingCandidate.count({ where: { meetingId: meeting.id } })).toBe(1);
    });

    it("removes the caller's own candidate together with its votes", async () => {
        const meeting = await createMeeting(group);
        const candidate = await createCandidate(meeting, member);
        await createVote(candidate, owner);
        signIn(member);

        const res = await api.removeCandidate(group.id, meeting.id, candidate.id);

        expect(res.status).toBe(200);
        expect(await prisma.meetingCandidate.count({ where: { id: candidate.id } })).toBe(0);
        expect(await prisma.vote.count()).toBe(0);
    });

    it("refuses to remove a candidate proposed by somebody else", async () => {
        const meeting = await createMeeting(group);
        const candidate = await createCandidate(meeting, owner);
        signIn(member);

        const res = await api.removeCandidate(group.id, meeting.id, candidate.id);

        expect(res.status).toBe(403);
        expect(await prisma.meetingCandidate.count({ where: { id: candidate.id } })).toBe(1);
    });
});

describe("votes", () => {
    it("toggles the vote of the caller", async () => {
        const meeting = await createMeeting(group);
        const candidate = await createCandidate(meeting, owner);
        signIn(member);

        expect(await (await api.vote(group.id, candidate.id)).json()).toEqual({ voted: true });
        expect(await prisma.vote.count()).toBe(1);

        expect(await (await api.vote(group.id, candidate.id)).json()).toEqual({ voted: false });
        expect(await prisma.vote.count()).toBe(0);
    });

    it("keeps one vote per user and candidate", async () => {
        const meeting = await createMeeting(group);
        const candidate = await createCandidate(meeting, owner);

        signIn(member);
        await api.vote(group.id, candidate.id);
        signIn(owner);
        await api.vote(group.id, candidate.id);

        const votes = await prisma.vote.findMany({ where: { candidateId: candidate.id } });
        expect(votes.map(vote => vote.userId).sort()).toEqual([member.id, owner.id].sort());
    });
});

describe("GET /api/groups/[groupId]/meetings", () => {
    it("returns upcoming meetings with their candidates and votes", async () => {
        const meeting = await createMeeting(group);
        const candidate = await createCandidate(meeting, owner);
        await createVote(candidate, member);

        signIn(member);
        const res = await api.listMeetings(group.id);
        const meetings = await res.json();

        expect(res.status).toBe(200);
        expect(meetings).toHaveLength(1);
        expect(meetings[0].candidates).toHaveLength(1);
        expect(meetings[0].candidates[0].votes).toHaveLength(1);
        expect(meetings[0].candidates[0].user.id).toBe(owner.id);
    });

    it("hides meetings older than a day", async () => {
        await createMeeting(group, { date: new Date(Date.now() - 3 * 86400000) });

        signIn(member);
        const res = await api.listMeetings(group.id);

        expect(await res.json()).toEqual([]);
    });

    it("rejects a meeting date in the past on creation", async () => {
        signIn(member);

        const res = await api.createMeeting(group.id, {
            date: new Date(Date.now() - 86400000).toISOString(),
        });

        expect(res.status).toBe(400);
    });
});
