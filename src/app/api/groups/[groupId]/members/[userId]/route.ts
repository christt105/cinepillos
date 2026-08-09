import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireGroupMember } from "@/lib/auth-guards";

/** A member leaves on their own, or the owner (or a site admin) removes someone else. */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
    const { groupId, userId } = await params;
    const auth = await requireGroupMember(groupId);
    if (!auth.ok) return auth.response;

    const isSelf = auth.session.user.id === userId;
    const isOwnerOrAdmin = auth.membership?.role === "OWNER" || auth.session.user.isAdmin;

    if (!isSelf && !isOwnerOrAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.membership.delete({ where: { id: membership.id } });

    return NextResponse.json({ removed: true });
}
