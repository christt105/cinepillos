import { NextResponse } from "next/server";
import { requireGroupMember } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ groupId: string; id: string }> };

/** Resolves the proposal only when it really belongs to the group in the URL. */
async function resolveProposal(groupId: string, id: string) {
    const auth = await requireGroupMember(groupId);
    if (!auth.ok) return { ok: false as const, response: auth.response };

    const proposal = await prisma.proposal.findUnique({ where: { id } });

    if (!proposal || proposal.groupId !== auth.group.id) {
        return { ok: false as const, response: new NextResponse("Not Found", { status: 404 }) };
    }

    return { ok: true as const, userId: auth.user.id, proposalId: proposal.id };
}

const countLikes = (proposalId: string) => prisma.like.count({ where: { proposalId } });

export async function POST(request: Request, { params }: Context) {
    try {
        const { groupId, id } = await params;

        const target = await resolveProposal(groupId, id);
        if (!target.ok) return target.response;

        const { userId, proposalId } = target;

        // Idempotent: the unique pair means a second like is a no-op.
        await prisma.like.upsert({
            where: { userId_proposalId: { userId, proposalId } },
            create: { userId, proposalId },
            update: {},
        });

        return NextResponse.json({ liked: true, count: await countLikes(proposalId) });
    } catch (error) {
        console.error("[PROPOSAL_LIKE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: Context) {
    try {
        const { groupId, id } = await params;

        const target = await resolveProposal(groupId, id);
        if (!target.ok) return target.response;

        const { userId, proposalId } = target;

        await prisma.like.deleteMany({ where: { userId, proposalId } });

        return NextResponse.json({ liked: false, count: await countLikes(proposalId) });
    } catch (error) {
        console.error("[PROPOSAL_LIKE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
