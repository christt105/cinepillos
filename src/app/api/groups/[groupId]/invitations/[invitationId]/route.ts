import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireGroupMember } from "@/lib/auth-guards";

/** Owner (or a site admin) revokes an invitation they no longer want honoured. */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ groupId: string; invitationId: string }> }
) {
    const { groupId, invitationId } = await params;
    const auth = await requireGroupMember(groupId);
    if (!auth.ok) return auth.response;

    if (auth.membership?.role !== "OWNER" && !auth.session.user.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.groupId !== groupId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.invitation.update({
        where: { id: invitationId },
        data: { revokedAt: new Date() },
    });

    return NextResponse.json({ revoked: true });
}
