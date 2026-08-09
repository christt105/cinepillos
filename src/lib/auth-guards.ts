import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Group, Meeting, MeetingCandidate, Membership, User } from "@prisma/client";

type GuardFailure = { ok: false; response: NextResponse };

type GroupAccess = {
    session: Session;
    user: User;
    group: Group;
    membership: Membership | null;
};

type SessionGuard = ({ ok: true; session: Session }) | GuardFailure;

type GroupGuard = ({ ok: true } & GroupAccess) | GuardFailure;

type MeetingGuard = ({ ok: true; meeting: Meeting } & GroupAccess) | GuardFailure;

type CandidateGuard =
    | ({ ok: true; meeting: Meeting; candidate: MeetingCandidate } & GroupAccess)
    | GuardFailure;

const unauthorized = (): GuardFailure => ({
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
});

const forbidden = (): GuardFailure => ({
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
});

const notFound = (): GuardFailure => ({
    ok: false,
    response: NextResponse.json({ error: "Not found" }, { status: 404 }),
});

/** Resolves the current session, or a 401 response when there is none. */
export async function requireSession(): Promise<SessionGuard> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return unauthorized();
    }

    return { ok: true, session };
}

async function resolveGroupAccess(
    session: Session,
    groupId: string
): Promise<({ ok: true } & GroupAccess) | GuardFailure> {
    const [user, group] = await Promise.all([
        prisma.user.findUnique({
            where: { id: session.user.id },
            include: { memberships: { where: { groupId } } },
        }),
        prisma.group.findUnique({ where: { id: groupId } }),
    ]);

    if (!user || !group) return forbidden();

    const membership = user.memberships[0] ?? null;
    if (!membership && !user.isAdmin) return forbidden();

    return { ok: true, session, user, group, membership };
}

/**
 * Resolves the session, user and group for `groupId`, or a 403 response when
 * the caller is neither a member of the group nor an admin. Unknown groups also
 * get a 403 so the endpoint cannot be used to probe for existing groups.
 */
export async function requireGroupMember(
    groupId: string,
    session?: Session
): Promise<GroupGuard> {
    if (session) return resolveGroupAccess(session, groupId);

    const auth = await requireSession();
    if (!auth.ok) return auth;

    return resolveGroupAccess(auth.session, groupId);
}

/**
 * Same as `requireGroupMember`, but also demands the caller owns the group. A
 * site admin passes without a membership, which is why the owner check cannot
 * be folded into `resolveGroupAccess`.
 */
export async function requireGroupOwner(groupId: string): Promise<GroupGuard> {
    const access = await requireGroupMember(groupId);
    if (!access.ok) return access;

    if (access.membership?.role !== "OWNER" && !access.session.user.isAdmin) {
        return forbidden();
    }

    return access;
}

/**
 * Same as `requireGroupMember`, but takes the group from the meeting itself so
 * routes nested under a meeting never trust a group id coming from the session.
 * When `expectedGroupId` is given, the meeting must also belong to that group.
 */
export async function requireMeetingMember(
    meetingId: string,
    expectedGroupId?: string
): Promise<MeetingGuard> {
    const auth = await requireSession();
    if (!auth.ok) return auth;

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) return notFound();

    if (expectedGroupId && meeting.groupId !== expectedGroupId) return forbidden();

    const access = await resolveGroupAccess(auth.session, meeting.groupId);
    if (!access.ok) return access;

    return { ...access, meeting };
}

/** Resolves the group through `candidate → meeting → group`. */
export async function requireCandidateMember(
    candidateId: string,
    expectedGroupId?: string
): Promise<CandidateGuard> {
    const auth = await requireSession();
    if (!auth.ok) return auth;

    const candidate = await prisma.meetingCandidate.findUnique({
        where: { id: candidateId },
        include: { meeting: true },
    });
    if (!candidate) return notFound();

    const { meeting } = candidate;
    if (expectedGroupId && meeting.groupId !== expectedGroupId) return forbidden();

    const access = await resolveGroupAccess(auth.session, meeting.groupId);
    if (!access.ok) return access;

    return { ...access, meeting, candidate };
}
