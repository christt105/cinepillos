import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", async () => {
    const { getSession } = await import("./session");
    return { getServerSession: async () => getSession() };
});

vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import type { Group, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GROUP_MEMBER_CAP } from "@/lib/invitations";
import { api } from "./routes";
import { signIn, signOut } from "./session";
import { createGroup, createInvitation, createUser, resetDatabase } from "./factories";

/**
 * Dedicated coverage for the one deliberate hole in group access: accepting an
 * invitation is the sole way to reach a group the caller is not yet a member
 * of. Every check here confirms that hole stays exactly as wide as an
 * invitation link makes it, and no wider.
 */
type World = {
    owner: User;
    outsider: User;
    group: Group;
};

let world: World;

beforeEach(async () => {
    await resetDatabase();
    signOut();

    const owner = await createUser({ name: "Owner" });
    const outsider = await createUser({ name: "Outsider" });
    const group = await createGroup([{ user: owner, role: "OWNER" }], { name: "Group A" });

    world = { owner, outsider, group };
});

describe("creating invitations", () => {
    it("lets the owner create an invitation", async () => {
        signIn(world.owner);

        const res = await api.createInvitation(world.group.id);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.groupId).toBe(world.group.id);
        expect(body.token).toBeTruthy();
    });

    it("refuses a regular member", async () => {
        const member = await createUser({ name: "Member" });
        await prisma.membership.create({ data: { userId: member.id, groupId: world.group.id, role: "MEMBER" } });
        signIn(member);

        const res = await api.createInvitation(world.group.id);

        expect(res.status).toBe(403);
    });

    it("refuses an outsider", async () => {
        signIn(world.outsider);

        const res = await api.createInvitation(world.group.id);

        expect(res.status).toBe(403);
    });
});

describe("accepting an invitation grants access to exactly that group", () => {
    it("lets the invited user join and then use the group's normal routes", async () => {
        const invitation = await createInvitation(world.group, world.owner);
        signIn(world.outsider);

        const before = await api.listProposals(world.group.id, "all");
        expect(before.status).toBe(403);

        const res = await api.acceptInvitation(invitation.token);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ groupId: world.group.id });

        const membership = await prisma.membership.findUnique({
            where: { userId_groupId: { userId: world.outsider.id, groupId: world.group.id } },
        });
        expect(membership).not.toBeNull();
        expect(membership?.role).toBe("MEMBER");

        const after = await api.listProposals(world.group.id, "all");
        expect(after.status).toBe(200);
    });

    it("does not grant access to any other group", async () => {
        const otherGroup = await createGroup([{ user: world.owner, role: "OWNER" }], { name: "Group B" });
        const invitation = await createInvitation(world.group, world.owner);
        signIn(world.outsider);

        await api.acceptInvitation(invitation.token);

        const res = await api.listProposals(otherGroup.id, "all");
        expect(res.status).toBe(403);
    });

    it("refuses an anonymous caller", async () => {
        const invitation = await createInvitation(world.group, world.owner);
        signOut();

        const res = await api.acceptInvitation(invitation.token);

        expect(res.status).toBe(401);
    });
});

describe("the unhappy paths", () => {
    it("refuses an expired invitation", async () => {
        const invitation = await createInvitation(world.group, world.owner, {
            expiresAt: new Date(Date.now() - 1000),
        });
        signIn(world.outsider);

        const res = await api.acceptInvitation(invitation.token);

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe("expired");
    });

    it("refuses a revoked invitation", async () => {
        const invitation = await createInvitation(world.group, world.owner, {
            revokedAt: new Date(),
        });
        signIn(world.outsider);

        const res = await api.acceptInvitation(invitation.token);

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe("revoked");
    });

    it("refuses an invitation that already hit its use cap", async () => {
        const invitation = await createInvitation(world.group, world.owner, {
            maxUses: 1,
            useCount: 1,
        });
        signIn(world.outsider);

        const res = await api.acceptInvitation(invitation.token);

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe("used_up");
    });

    it("refuses someone who is already a member", async () => {
        const invitation = await createInvitation(world.group, world.owner);
        signIn(world.owner);

        const res = await api.acceptInvitation(invitation.token);

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe("already_member");
    });

    it("refuses when the group is already full", async () => {
        for (let i = 0; i < GROUP_MEMBER_CAP - 1; i++) {
            const member = await createUser({ name: `Filler ${i}` });
            await prisma.membership.create({
                data: { userId: member.id, groupId: world.group.id, role: "MEMBER" },
            });
        }
        const invitation = await createInvitation(world.group, world.owner);
        signIn(world.outsider);

        const res = await api.acceptInvitation(invitation.token);

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe("group_full");
    });

    it("treats a deleted group's invitation as not found instead of erroring", async () => {
        const invitation = await createInvitation(world.group, world.owner);
        await prisma.group.delete({ where: { id: world.group.id } });
        signIn(world.outsider);

        const status = await api.getInvitation(invitation.token);
        expect((await status.json()).status).toBe("not_found");

        const res = await api.acceptInvitation(invitation.token);
        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe("not_found");
    });
});

describe("revoking, leaving and removing", () => {
    it("makes a revoked invitation unusable", async () => {
        const invitation = await createInvitation(world.group, world.owner);
        signIn(world.owner);

        const revoke = await api.revokeInvitation(world.group.id, invitation.id);
        expect(revoke.status).toBe(200);

        signIn(world.outsider);
        const res = await api.acceptInvitation(invitation.token);
        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe("revoked");
    });

    it("lets a member leave the group", async () => {
        const invitation = await createInvitation(world.group, world.owner);
        signIn(world.outsider);
        await api.acceptInvitation(invitation.token);

        const res = await api.removeMember(world.group.id, world.outsider.id);
        expect(res.status).toBe(200);

        const membership = await prisma.membership.findUnique({
            where: { userId_groupId: { userId: world.outsider.id, groupId: world.group.id } },
        });
        expect(membership).toBeNull();
    });

    it("lets the owner remove another member", async () => {
        const invitation = await createInvitation(world.group, world.owner);
        signIn(world.outsider);
        await api.acceptInvitation(invitation.token);

        signIn(world.owner);
        const res = await api.removeMember(world.group.id, world.outsider.id);
        expect(res.status).toBe(200);
    });

    it("refuses a member removing someone else", async () => {
        const invitation = await createInvitation(world.group, world.owner);
        signIn(world.outsider);
        await api.acceptInvitation(invitation.token);

        const other = await createUser({ name: "Other" });
        const otherInvitation = await createInvitation(world.group, world.owner);
        signIn(other);
        await api.acceptInvitation(otherInvitation.token);

        signIn(world.outsider);
        const res = await api.removeMember(world.group.id, other.id);
        expect(res.status).toBe(403);
    });
});
