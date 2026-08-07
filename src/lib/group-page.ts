import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Group, Membership } from "@prisma/client";

type GroupPageAccess = {
    session: Session;
    group: Group;
    membership: Membership | null;
};

/**
 * Page-side counterpart of `requireGroupMember`: sends anonymous visitors to
 * the login page and answers 403 for anyone who is not a member of the group,
 * so a group URL can be shared without leaking its contents.
 */
export async function requireGroupPage(groupId: string): Promise<GroupPageAccess> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { memberships: { where: { userId: session.user.id } } },
    });

    if (!group) forbidden();

    const membership = group.memberships[0] ?? null;
    if (!membership && !session.user.isAdmin) forbidden();

    return { session, group, membership };
}

/**
 * The group the user visited last. It only drives the redirect from `/`, it is
 * never a source of authorization.
 */
export async function rememberLastGroup(session: Session, groupId: string) {
    if (session.user.activeGroupId === groupId) return;

    await prisma.user.update({
        where: { id: session.user.id },
        data: { activeGroupId: groupId },
    });
}

/** Resolves where `/` and the legacy routes should send the user. */
export async function resolveLandingGroupId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    const groups = session.user.groups ?? [];
    const lastVisited = session.user.activeGroupId;

    if (lastVisited && groups.some(group => group.id === lastVisited)) {
        return lastVisited;
    }

    return groups[0]?.id ?? null;
}
