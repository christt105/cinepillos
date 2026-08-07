import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", async () => {
    const { getSession } = await import("./session");
    return { getServerSession: async () => getSession() };
});

vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import type { Group, Meeting, MeetingCandidate, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { api } from "./routes";
import { signIn, signOut } from "./session";
import {
    createCandidate,
    createGroup,
    createMeeting,
    createProposal,
    createUser,
    resetDatabase,
} from "./factories";

/**
 * Two groups with one member each, plus a full meeting on the B side. Every
 * test below drives the A user against the B group and expects a 403 — a 200
 * with an empty payload would mean the route only filters, and filters can be
 * bypassed by guessing an id.
 */
type World = {
    alice: User;
    bob: User;
    groupA: Group;
    groupB: Group;
    meetingB: Meeting;
    candidateB: MeetingCandidate;
};

let world: World;

beforeEach(async () => {
    await resetDatabase();
    signOut();

    const alice = await createUser({ name: "Alice" });
    const bob = await createUser({ name: "Bob" });
    const groupA = await createGroup([{ user: alice, role: "OWNER" }], { name: "Group A" });
    const groupB = await createGroup([{ user: bob, role: "OWNER" }], { name: "Group B" });
    const meetingB = await createMeeting(groupB);
    const candidateB = await createCandidate(meetingB, bob);

    await createProposal(groupB, bob);

    world = { alice, bob, groupA, groupB, meetingB, candidateB };
});

describe("cross-group reads", () => {
    it("does not leak the proposals of another group", async () => {
        signIn(world.alice);

        const res = await api.listProposals(world.groupB.id, "all");

        expect(res.status).toBe(403);
    });

    it("does not leak the meetings of another group", async () => {
        signIn(world.alice);

        const res = await api.listMeetings(world.groupB.id);

        expect(res.status).toBe(403);
    });

    it("only returns the rows of the caller's own group", async () => {
        const own = await createProposal(world.groupA, world.alice);
        signIn(world.alice);

        const res = await api.listProposals(world.groupA.id, "all");
        const proposals = await res.json();

        expect(res.status).toBe(200);
        expect(proposals).toHaveLength(1);
        expect(proposals[0].id).toBe(own.id);
    });
});

describe("cross-group writes", () => {
    it("refuses to move activeGroup to a group the user is not in", async () => {
        signIn(world.alice);

        const res = await api.setActiveGroup(world.groupB.id);

        expect(res.status).toBe(403);
        const alice = await prisma.user.findUniqueOrThrow({ where: { id: world.alice.id } });
        expect(alice.activeGroupId).toBeNull();
    });

    it("refuses to create a meeting in another group", async () => {
        signIn(world.alice);

        const res = await api.createMeeting(world.groupB.id, {
            date: new Date(Date.now() + 86400000).toISOString(),
        });

        expect(res.status).toBe(403);
        expect(await prisma.meeting.count({ where: { groupId: world.groupB.id } })).toBe(1);
    });

    it("refuses to add a candidate to a meeting of another group", async () => {
        signIn(world.alice);

        const res = await api.addCandidate(world.groupB.id, world.meetingB.id, {
            filmId: world.candidateB.filmId,
        });

        expect(res.status).toBe(403);
        expect(await prisma.meetingCandidate.count({ where: { meetingId: world.meetingB.id } })).toBe(1);
    });

    it("refuses to vote a candidate of another group", async () => {
        signIn(world.alice);

        const res = await api.vote(world.groupB.id, world.candidateB.id);

        expect(res.status).toBe(403);
        expect(await prisma.vote.count()).toBe(0);
    });

    it("refuses to conclude a meeting of another group", async () => {
        signIn(world.alice);

        const res = await api.conclude(world.groupB.id, world.meetingB.id);

        expect(res.status).toBe(403);
        const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: world.meetingB.id } });
        expect(meeting.status).toBe("VOTING");
    });

    it("refuses to delete a proposal of another group", async () => {
        const proposal = await prisma.proposal.findFirstOrThrow({
            where: { groupId: world.groupB.id },
        });
        signIn(world.alice);

        const res = await api.deleteProposal(world.groupB.id, proposal.id);

        expect(res.status).toBe(403);
        expect(await prisma.proposal.count({ where: { id: proposal.id } })).toBe(1);
    });

    it("refuses to remove a candidate of another group", async () => {
        signIn(world.alice);

        const res = await api.removeCandidate(
            world.groupB.id,
            world.meetingB.id,
            world.candidateB.id
        );

        expect(res.status).toBe(403);
        expect(await prisma.meetingCandidate.count({ where: { id: world.candidateB.id } })).toBe(1);
    });
});

describe("group id smuggling", () => {
    it("rejects a meeting id from another group even when the URL says the caller's group", async () => {
        signIn(world.alice);

        const res = await api.conclude(world.groupA.id, world.meetingB.id);

        expect(res.status).toBe(403);
    });

    it("rejects a candidate id from another group under the caller's group URL", async () => {
        signIn(world.alice);

        const res = await api.vote(world.groupA.id, world.candidateB.id);

        expect(res.status).toBe(403);
        expect(await prisma.vote.count()).toBe(0);
    });

    it("does not delete a proposal of another group under the caller's group URL", async () => {
        const proposal = await prisma.proposal.findFirstOrThrow({
            where: { groupId: world.groupB.id },
        });
        signIn(world.alice);

        const res = await api.deleteProposal(world.groupA.id, proposal.id);

        expect(res.status).toBe(404);
        expect(await prisma.proposal.count({ where: { id: proposal.id } })).toBe(1);
    });
});

describe("the guard is not overzealous inside the caller's own group", () => {
    it("lets a member do the five actions in their own group", async () => {
        const carol = await createUser({ name: "Carol" });
        const group = await createGroup([
            { user: carol, role: "OWNER" },
            { user: world.alice, role: "MEMBER" },
        ]);
        signIn(world.alice);

        const activeGroup = await api.setActiveGroup(group.id);
        expect(activeGroup.status).toBe(200);

        const created = await api.createMeeting(group.id, {
            date: new Date(Date.now() + 86400000).toISOString(),
        });
        expect(created.status).toBe(200);
        const meeting = await created.json();

        const proposal = await api.createProposal(group.id, {
            tmdbId: 550,
            title: "Fight Club",
            overview: "An insomniac office worker",
            posterPath: "/poster.jpg",
            releaseDate: "1999-10-15",
        });
        expect(proposal.status).toBe(200);

        const film = await prisma.film.findUniqueOrThrow({ where: { tmdbId: 550 } });
        const candidate = await api.addCandidate(group.id, meeting.id, { filmId: film.id });
        expect(candidate.status).toBe(200);
        const candidateBody = await candidate.json();

        const vote = await api.vote(group.id, candidateBody.id);
        expect(vote.status).toBe(200);
        expect(await vote.json()).toEqual({ voted: true });

        const listed = await api.listMeetings(group.id);
        expect(listed.status).toBe(200);
        expect(await listed.json()).toHaveLength(1);
    });

    it("still refuses an anonymous caller", async () => {
        signOut();

        expect((await api.listMeetings(world.groupA.id)).status).toBe(401);
        expect((await api.vote(world.groupB.id, world.candidateB.id)).status).toBe(401);
    });
});
