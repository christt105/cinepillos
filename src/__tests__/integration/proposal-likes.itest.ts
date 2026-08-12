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
import { createGroup, createProposal, createUser, resetDatabase } from "./factories";

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

describe("likes on proposals", () => {
    it("likes a proposal of the group and reports the count", async () => {
        const proposal = await createProposal(group, owner);
        signIn(member);

        const res = await api.likeProposal(group.id, proposal.id);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ liked: true, count: 1 });
        expect(await prisma.like.count({ where: { proposalId: proposal.id } })).toBe(1);
    });

    it("does not duplicate a like already given", async () => {
        const proposal = await createProposal(group, owner);
        signIn(member);

        await api.likeProposal(group.id, proposal.id);
        const res = await api.likeProposal(group.id, proposal.id);

        expect(await res.json()).toEqual({ liked: true, count: 1 });
    });

    it("counts one like per member", async () => {
        const proposal = await createProposal(group, owner);

        signIn(member);
        await api.likeProposal(group.id, proposal.id);
        signIn(owner);
        const res = await api.likeProposal(group.id, proposal.id);

        expect(await res.json()).toEqual({ liked: true, count: 2 });
    });

    it("removes only the caller's like", async () => {
        const proposal = await createProposal(group, owner);

        signIn(owner);
        await api.likeProposal(group.id, proposal.id);
        signIn(member);
        await api.likeProposal(group.id, proposal.id);

        const res = await api.unlikeProposal(group.id, proposal.id);

        expect(await res.json()).toEqual({ liked: false, count: 1 });
        expect(await prisma.like.count({ where: { userId: owner.id } })).toBe(1);
    });

    it("accepts removing a like that was never given", async () => {
        const proposal = await createProposal(group, owner);
        signIn(member);

        const res = await api.unlikeProposal(group.id, proposal.id);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ liked: false, count: 0 });
    });

    it("answers 404 for a proposal of another group", async () => {
        const outsider = await createUser();
        const otherGroup = await createGroup([{ user: outsider, role: "OWNER" }]);
        const proposal = await createProposal(otherGroup, outsider);
        signIn(member);

        const res = await api.likeProposal(group.id, proposal.id);

        expect(res.status).toBe(404);
        expect(await prisma.like.count()).toBe(0);
    });

    it("refuses a caller outside the group", async () => {
        const proposal = await createProposal(group, owner);
        const outsider = await createUser();
        signIn(outsider);

        const res = await api.likeProposal(group.id, proposal.id);

        expect(res.status).toBe(403);
        expect(await prisma.like.count()).toBe(0);
    });

    it("leaves votes and meeting candidates alone", async () => {
        const proposal = await createProposal(group, owner);
        signIn(member);

        await api.likeProposal(group.id, proposal.id);

        expect(await prisma.vote.count()).toBe(0);
        expect(await prisma.meetingCandidate.count()).toBe(0);
    });

    it("lists every liker of a proposal, not just the caller's own like", async () => {
        const proposal = await createProposal(group, owner);
        signIn(member);
        await api.likeProposal(group.id, proposal.id);
        signIn(owner);
        await api.likeProposal(group.id, proposal.id);

        const res = await api.listProposals(group.id, "all");
        const [listed] = await res.json();

        expect(listed.likes).toHaveLength(2);
        expect(listed.likes.map((like: { user: { id: string } }) => like.user.id).sort()).toEqual(
            [member.id, owner.id].sort()
        );
    });
});
