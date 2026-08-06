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

        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                candidates: {
                    include: { votes: true }
                }
            }
        });

        if (!meeting) {
            return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
        }

        if (meeting.status !== "VOTING") {
            return NextResponse.json({ error: "Meeting is not in voting phase" }, { status: 400 });
        }

        const membership = meeting.groupId ? await prisma.membership.findUnique({
            where: { userId_groupId: { userId: session.user.id, groupId: meeting.groupId } }
        }) : null;

        if (membership?.role !== "OWNER") {
            return NextResponse.json({ error: "Only the group owner can conclude a meeting" }, { status: 403 });
        }

        let winnerId: string | null = null;
        let maxVotes = 0;

        for (const candidate of meeting.candidates) {
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
