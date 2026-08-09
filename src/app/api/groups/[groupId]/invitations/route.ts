import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireGroupOwner } from "@/lib/auth-guards";
import { invitationCreateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { generateInvitationToken } from "@/lib/invitations";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Owner (or a site admin) creates a shareable invite link for the group. */
export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    const auth = await requireGroupOwner(groupId);
    if (!auth.ok) return auth.response;

    if (!rateLimit(`invite-create:${auth.session.user.id}:${groupId}`, 10, 10 * 60 * 1000)) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = await parseBody(req, invitationCreateSchema);
    if (!body.ok) return body.response;

    const invitation = await prisma.invitation.create({
        data: {
            token: generateInvitationToken(),
            groupId,
            invitedBy: auth.session.user.id,
            expiresAt: new Date(Date.now() + body.data.expiresInDays * DAY_MS),
            maxUses: body.data.maxUses ?? null,
        },
    });

    return NextResponse.json(invitation);
}

/** Owner (or a site admin) lists the group's still-usable invitations to manage them. */
export async function GET(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    const auth = await requireGroupOwner(groupId);
    if (!auth.ok) return auth.response;

    const invitations = await prisma.invitation.findMany({
        where: { groupId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invitations);
}
