import { NextResponse } from "next/server";
import { requireGroupMember } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ groupId: string; id: string }> }
) {
    try {
        const { groupId, id } = await params;

        const auth = await requireGroupMember(groupId);
        if (!auth.ok) return auth.response;

        const proposal = await prisma.proposal.findUnique({
            where: { id },
        });

        if (!proposal || proposal.groupId !== auth.group.id) {
            return new NextResponse("Not Found", { status: 404 });
        }

        if (proposal.userId !== auth.user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        await prisma.proposal.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error("[PROPOSAL_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
