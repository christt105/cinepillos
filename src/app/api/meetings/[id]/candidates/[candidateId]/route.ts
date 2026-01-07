import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: meetingId, candidateId } = await params;

        // Check ownership
        const candidate = await prisma.meetingCandidate.findUnique({
            where: { id: candidateId }
        });

        if (!candidate) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // Only allow deletion if user owns it OR some admin logic (skipping admin for now)
        if (candidate.userId !== session.user.id) {
            return NextResponse.json({ error: "You can only remove your own proposals" }, { status: 403 });
        }

        // Delete associated votes first
        await prisma.vote.deleteMany({
            where: { candidateId }
        });

        await prisma.meetingCandidate.delete({
            where: { id: candidateId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error removing candidate:", error);
        return NextResponse.json({ error: "Failed to remove candidate" }, { status: 500 });
    }
}
