import { prisma } from "@/lib/prisma";
import { requireMeetingMember } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ groupId: string; id: string }> }
) {
    try {
        const { groupId, id: meetingId } = await params;

        const auth = await requireMeetingMember(meetingId, groupId);
        if (!auth.ok) return auth.response;

        if (auth.meeting.status !== "VOTING") {
            return NextResponse.json({ error: "Meeting is not in voting phase" }, { status: 400 });
        }

        if (auth.membership?.role !== "OWNER") {
            return NextResponse.json({ error: "Only the group owner can conclude a meeting" }, { status: 403 });
        }

        const candidates = await prisma.meetingCandidate.findMany({
            where: { meetingId },
            include: { votes: true }
        });

        let winnerId: string | null = null;
        let maxVotes = 0;

        for (const candidate of candidates) {
            const voteCount = candidate.votes.length;
            if (voteCount > maxVotes) {
                maxVotes = voteCount;
                winnerId = candidate.filmId;
            }
        }

        await prisma.meeting.update({
            where: { id: meetingId },
            data: { status: "CONCLUDED", selectedFilmId: winnerId }
        });

        return NextResponse.json({ success: true, winnerId });
    } catch (error) {
        console.error("Error concluding meeting:", error);
        return NextResponse.json({ error: "Failed to conclude meeting" }, { status: 500 });
    }
}
