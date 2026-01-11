import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: meetingId } = await params;

        // Get candidates and vote counts
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                candidates: {
                    include: {
                        votes: true
                    }
                }
            }
        });

        if (!meeting) {
            return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
        }

        if (meeting.status !== "VOTING") {
            return NextResponse.json({ error: "Meeting is not in voting phase" }, { status: 400 });
        }

        // Determine winner
        let winnerId = null;
        let maxVotes = -1;

        meeting.candidates.forEach((c: { votes: any[] }) => {
    const voteCount = c.votes.length;
    if (voteCount > maxVotes) {
        maxVotes = voteCount;
        // ...
    }
});

        if (!winnerId && meeting.candidates.length > 0) {
            // If no votes but candidates exist?
            // If maxVotes is 0, winnerId is the first one?
            // If maxVotes >= 0 it works.
        }

        await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status: "CONCLUDED",
                selectedFilmId: winnerId
            }
        });

        return NextResponse.json({ success: true, winnerId });
    } catch (error) {
        console.error("Error concluding meeting:", error);
        return NextResponse.json({ error: "Failed to conclude meeting" }, { status: 500 });
    }
}
