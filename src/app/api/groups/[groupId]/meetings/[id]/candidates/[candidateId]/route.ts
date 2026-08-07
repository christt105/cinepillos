import { prisma } from "@/lib/prisma";
import { requireMeetingMember } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ groupId: string; id: string; candidateId: string }> }
) {
    try {
        const { groupId, id: meetingId, candidateId } = await params;

        const auth = await requireMeetingMember(meetingId, groupId);
        if (!auth.ok) return auth.response;

        const candidate = await prisma.meetingCandidate.findUnique({
            where: { id: candidateId }
        });

        if (!candidate || candidate.meetingId !== meetingId) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // Only allow deletion if user owns it OR some admin logic (skipping admin for now)
        if (candidate.userId !== auth.user.id) {
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
