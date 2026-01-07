import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Correctly typing params for Next.js App Router API routes
// The second argument is the context, which contains params
export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = params;

        // Verify ownership
        const proposal = await prisma.proposal.findUnique({
            where: { id },
        });

        if (!proposal) {
            return new NextResponse("Not Found", { status: 404 });
        }

        if (proposal.userId !== session.user.id) {
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
