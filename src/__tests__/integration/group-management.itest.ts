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
    createGroup,
    createInvitation,
    createMeeting,
    createProposal,
    createUser,
    createVote,
    resetDatabase,
} from "./factories";

/**
 * Renaming, handing over and deleting a club against a real database, where the
 * cascades and the "a group always has an owner" invariant actually hold.
 */
type World = {
    owner: User;
    member: User;
    outsider: User;
    group: Group;
};

let world: World;

beforeEach(async () => {
    await resetDatabase();
    signOut();

    const owner = await createUser({ name: "Owner" });
    const member = await createUser({ name: "Member" });
    const outsider = await createUser({ name: "Outsider" });
    const group = await createGroup(
        [{ user: owner, role: "OWNER" }, { user: member, role: "MEMBER" }],
        { name: "Group A" }
    );

    world = { owner, member, outsider, group };
});

describe("renaming a club", () => {
    it("lets the owner rename it", async () => {
        signIn(world.owner);

        const res = await api.renameGroup(world.group.id, "Cinepillos");

        expect(res.status).toBe(200);
        const reloaded = await prisma.group.findUnique({ where: { id: world.group.id } });
        expect(reloaded?.name).toBe("Cinepillos");
    });

    it("refuses a regular member", async () => {
        signIn(world.member);

        const res = await api.renameGroup(world.group.id, "Cinepillos");

        expect(res.status).toBe(403);
        const reloaded = await prisma.group.findUnique({ where: { id: world.group.id } });
        expect(reloaded?.name).toBe("Group A");
    });

    it("refuses an outsider", async () => {
        signIn(world.outsider);

        const res = await api.renameGroup(world.group.id, "Cinepillos");

        expect(res.status).toBe(403);
    });

    it("refuses an anonymous caller", async () => {
        signOut();

        const res = await api.renameGroup(world.group.id, "Cinepillos");

        expect(res.status).toBe(401);
    });
});

describe("handing the club over", () => {
    it("makes the target the owner and steps the previous one down", async () => {
        signIn(world.owner);

        const res = await api.setMemberRole(world.group.id, world.member.id, "OWNER");
        expect(res.status).toBe(200);

        const roles = await prisma.membership.findMany({
            where: { groupId: world.group.id },
            select: { userId: true, role: true },
        });
        expect(roles).toEqual(
            expect.arrayContaining([
                { userId: world.member.id, role: "OWNER" },
                { userId: world.owner.id, role: "MEMBER" },
            ])
        );
    });

    it("moves the owner-only powers along with the role", async () => {
        signIn(world.owner);
        await api.setMemberRole(world.group.id, world.member.id, "OWNER");

        const oldOwner = await api.createInvitation(world.group.id);
        expect(oldOwner.status).toBe(403);

        signIn(world.member);
        const newOwner = await api.createInvitation(world.group.id);
        expect(newOwner.status).toBe(200);
    });

    it("refuses a regular member promoting themselves", async () => {
        signIn(world.member);

        const res = await api.setMemberRole(world.group.id, world.member.id, "OWNER");

        expect(res.status).toBe(403);
    });

    it("refuses an outsider", async () => {
        signIn(world.outsider);

        const res = await api.setMemberRole(world.group.id, world.outsider.id, "OWNER");

        expect(res.status).toBe(403);
    });

    it("refuses to promote someone who is not a member", async () => {
        signIn(world.owner);

        const res = await api.setMemberRole(world.group.id, world.outsider.id, "OWNER");

        expect(res.status).toBe(404);
    });
});

describe("a club always keeps an owner", () => {
    it("refuses to let the only owner leave", async () => {
        signIn(world.owner);

        const res = await api.removeMember(world.group.id, world.owner.id);

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe("last_owner");
        const membership = await prisma.membership.findUnique({
            where: { userId_groupId: { userId: world.owner.id, groupId: world.group.id } },
        });
        expect(membership).not.toBeNull();
    });

    it("refuses to let the only owner demote themselves", async () => {
        signIn(world.owner);

        const res = await api.setMemberRole(world.group.id, world.owner.id, "MEMBER");

        expect(res.status).toBe(409);
    });

    it("lets the previous owner leave after handing the club over", async () => {
        signIn(world.owner);
        await api.setMemberRole(world.group.id, world.member.id, "OWNER");

        const res = await api.removeMember(world.group.id, world.owner.id);

        expect(res.status).toBe(200);
        const remaining = await prisma.membership.findMany({ where: { groupId: world.group.id } });
        expect(remaining).toHaveLength(1);
        expect(remaining[0]).toMatchObject({ userId: world.member.id, role: "OWNER" });
    });
});

describe("deleting a club", () => {
    it("takes its proposals, meetings, votes and invitations with it", async () => {
        const meeting = await createMeeting(world.group);
        const candidate = await createCandidate(meeting, world.member);
        await createVote(candidate, world.member);
        await createProposal(world.group, world.member);
        await createInvitation(world.group, world.owner);
        signIn(world.owner);

        const res = await api.deleteGroup(world.group.id);
        expect(res.status).toBe(200);

        expect(await prisma.group.findUnique({ where: { id: world.group.id } })).toBeNull();
        expect(await prisma.membership.count({ where: { groupId: world.group.id } })).toBe(0);
        expect(await prisma.proposal.count({ where: { groupId: world.group.id } })).toBe(0);
        expect(await prisma.meeting.count({ where: { groupId: world.group.id } })).toBe(0);
        expect(await prisma.meetingCandidate.count({ where: { meetingId: meeting.id } })).toBe(0);
        expect(await prisma.vote.count({ where: { candidateId: candidate.id } })).toBe(0);
        expect(await prisma.invitation.count({ where: { groupId: world.group.id } })).toBe(0);
    });

    it("leaves the members themselves alone", async () => {
        signIn(world.owner);

        await api.deleteGroup(world.group.id);

        expect(await prisma.user.findUnique({ where: { id: world.owner.id } })).not.toBeNull();
        expect(await prisma.user.findUnique({ where: { id: world.member.id } })).not.toBeNull();
    });

    it("clears the deleted club from whoever was parked on it", async () => {
        await prisma.user.update({
            where: { id: world.member.id },
            data: { activeGroupId: world.group.id },
        });
        signIn(world.owner);

        await api.deleteGroup(world.group.id);

        const reloaded = await prisma.user.findUnique({ where: { id: world.member.id } });
        expect(reloaded?.activeGroupId).toBeNull();
    });

    it("does not touch any other club", async () => {
        const otherGroup = await createGroup([{ user: world.owner, role: "OWNER" }], { name: "Group B" });
        await createProposal(otherGroup, world.owner);
        signIn(world.owner);

        await api.deleteGroup(world.group.id);

        expect(await prisma.group.findUnique({ where: { id: otherGroup.id } })).not.toBeNull();
        expect(await prisma.proposal.count({ where: { groupId: otherGroup.id } })).toBe(1);
    });

    it("refuses a regular member", async () => {
        signIn(world.member);

        const res = await api.deleteGroup(world.group.id);

        expect(res.status).toBe(403);
        expect(await prisma.group.findUnique({ where: { id: world.group.id } })).not.toBeNull();
    });

    it("refuses an outsider", async () => {
        signIn(world.outsider);

        const res = await api.deleteGroup(world.group.id);

        expect(res.status).toBe(403);
        expect(await prisma.group.findUnique({ where: { id: world.group.id } })).not.toBeNull();
    });

    it("refuses an anonymous caller", async () => {
        signOut();

        const res = await api.deleteGroup(world.group.id);

        expect(res.status).toBe(401);
    });

    it("lets a site admin delete a club they do not belong to", async () => {
        const admin = await createUser({ name: "Admin", isAdmin: true });
        signIn(admin);

        const res = await api.deleteGroup(world.group.id);

        expect(res.status).toBe(200);
        expect(await prisma.group.findUnique({ where: { id: world.group.id } })).toBeNull();
    });

    it("shuts the group's other routes down once it is gone", async () => {
        signIn(world.owner);
        await api.deleteGroup(world.group.id);

        const res = await api.listProposals(world.group.id, "all");

        expect(res.status).toBe(403);
    });
});
