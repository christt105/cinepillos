import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Checked when an invitation is accepted, not when it is created. */
export const GROUP_MEMBER_CAP = 30;

export function generateInvitationToken(): string {
    return randomBytes(24).toString("base64url");
}

type InvitationGroup = { id: string; name: string };

export type InvitationState =
    | { status: "not_found" }
    | { status: "revoked"; group: InvitationGroup }
    | { status: "expired"; group: InvitationGroup }
    | { status: "used_up"; group: InvitationGroup }
    | { status: "already_member"; group: InvitationGroup }
    | { status: "group_full"; group: InvitationGroup }
    | { status: "valid"; group: InvitationGroup };

/**
 * The club an invitation belongs to, with none of the acceptance rules. Used
 * by the link preview, which has no session to check them against.
 */
export async function findInvitationGroup(token: string): Promise<InvitationGroup | null> {
    const invitation = await prisma.invitation.findUnique({
        where: { token },
        select: { group: { select: { id: true, name: true } } },
    });

    return invitation?.group ?? null;
}

/**
 * Every rule an invitation must pass to be accepted, shared by the `/invite`
 * page (to explain why a link doesn't work) and the accept endpoint (to
 * enforce it). A deleted group takes its invitations with it via the schema's
 * cascade, so it surfaces here simply as "not_found" rather than a case of
 * its own.
 */
export async function resolveInvitationState(token: string, userId: string): Promise<InvitationState> {
    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { group: { select: { id: true, name: true } } },
    });

    if (!invitation) return { status: "not_found" };

    const { group } = invitation;

    if (invitation.revokedAt) return { status: "revoked", group };
    if (invitation.expiresAt.getTime() <= Date.now()) return { status: "expired", group };
    if (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses) {
        return { status: "used_up", group };
    }

    const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId, groupId: group.id } },
    });
    if (membership) return { status: "already_member", group };

    const memberCount = await prisma.membership.count({ where: { groupId: group.id } });
    if (memberCount >= GROUP_MEMBER_CAP) return { status: "group_full", group };

    return { status: "valid", group };
}
