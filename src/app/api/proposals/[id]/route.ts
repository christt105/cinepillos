import { NextResponse } from "next/server";
import { requireGroupMember, requireSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

// Correctly typing params for Next.js App Router API routes
// The second argument is the context, which contains params
export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const auth = await requireSession();
        if (!auth.ok) return auth.response;

        const { id } = params;

        const proposal = await prisma.proposal.findUnique({
            where: { id },
        });

        if (!proposal) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const access = await requireGroupMember(proposal.groupId, auth.session);
        if (!access.ok) return access.response;

        if (proposal.userId !== auth.session.user.id) {
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
