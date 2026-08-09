import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-guards";
import { resolveInvitationState } from "@/lib/invitations";

/**
 * The one deliberate exception to the group guards in `auth-guards.ts`: by
 * definition, accepting an invitation grants access to a group the caller is
 * not yet a member of. It never calls `requireGroupMember` — only a plain
 * session check plus `resolveInvitationState`, which is the single source of
 * truth for whether a token is usable, shared with the `/invite/[token]` page.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const { token } = await params;
    const state = await resolveInvitationState(token, auth.session.user.id);

    return NextResponse.json(state);
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const { token } = await params;
    const userId = auth.session.user.id;
    const state = await resolveInvitationState(token, userId);

    if (state.status !== "valid") {
        return NextResponse.json({ error: state.status }, { status: 409 });
    }

    const invitation = await prisma.invitation.findUniqueOrThrow({ where: { token } });

    try {
        await prisma.$transaction([
            prisma.membership.create({
                data: { userId, groupId: invitation.groupId, role: "MEMBER" },
            }),
            prisma.invitation.update({
                where: { id: invitation.id },
                data: { useCount: { increment: 1 } },
            }),
            prisma.user.update({
                where: { id: userId },
                data: { activeGroupId: invitation.groupId },
            }),
        ]);
    } catch {
        return NextResponse.json({ error: "already_member" }, { status: 409 });
    }

    return NextResponse.json({ groupId: invitation.groupId });
}
