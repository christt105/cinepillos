import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireGroupMember, requireGroupOwner } from "@/lib/auth-guards";
import { membershipUpdateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";

const OWNER = "OWNER";
const MEMBER = "MEMBER";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/**
 * A group with no owner can never be invited to, managed or deleted again, so
 * the last owner is refused both the exit and the demotion until they hand the
 * club over to someone else.
 */
const lastOwner = () => NextResponse.json({ error: "last_owner" }, { status: 409 });

async function isLastOwner(groupId: string, role: string) {
    if (role !== OWNER) return false;

    const owners = await prisma.membership.count({ where: { groupId, role: OWNER } });

    return owners <= 1;
}

/** A member leaves on their own, or the owner (or a site admin) removes someone else. */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
    const { groupId, userId } = await params;
    const auth = await requireGroupMember(groupId);
    if (!auth.ok) return auth.response;

    const isSelf = auth.session.user.id === userId;
    const isOwnerOrAdmin = auth.membership?.role === OWNER || auth.session.user.isAdmin;

    if (!isSelf && !isOwnerOrAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) {
        return notFound();
    }

    if (await isLastOwner(groupId, membership.role)) {
        return lastOwner();
    }

    await prisma.membership.delete({ where: { id: membership.id } });

    return NextResponse.json({ removed: true });
}

/**
 * Owner (or a site admin) hands the club over or steps someone back down.
 * Promoting is a transfer rather than a second owner: the group is left with
 * exactly one, so there is never a dispute over who can delete it.
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
    const { groupId, userId } = await params;
    const auth = await requireGroupOwner(groupId);
    if (!auth.ok) return auth.response;

    const body = await parseBody(req, membershipUpdateSchema);
    if (!body.ok) return body.response;

    const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) {
        return notFound();
    }

    const { role } = body.data;
    if (membership.role === role) {
        return NextResponse.json(membership);
    }

    if (role === MEMBER) {
        if (await isLastOwner(groupId, membership.role)) {
            return lastOwner();
        }

        const demoted = await prisma.membership.update({
            where: { id: membership.id },
            data: { role: MEMBER },
        });

        return NextResponse.json(demoted);
    }

    const promoted = await prisma.$transaction(async tx => {
        await tx.membership.updateMany({
            where: { groupId, role: OWNER },
            data: { role: MEMBER },
        });

        return tx.membership.update({ where: { id: membership.id }, data: { role: OWNER } });
    });

    return NextResponse.json(promoted);
}
