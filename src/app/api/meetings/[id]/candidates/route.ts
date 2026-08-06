import { prisma } from "@/lib/prisma";
import { requireMeetingMember } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: meetingId } = await params;

        const auth = await requireMeetingMember(meetingId);
        if (!auth.ok) return auth.response;

        const body = await request.json();
        const { filmId } = body;

        if (!filmId) {
            return NextResponse.json({ error: "Film ID is required" }, { status: 400 });
        }

        const existing = await prisma.meetingCandidate.findUnique({
            where: { meetingId_filmId: { meetingId, filmId } }
        });

        if (existing) {
            return NextResponse.json({ error: "Film already proposed for this meeting" }, { status: 400 });
        }

        const userCandidate = await prisma.meetingCandidate.findFirst({
            where: { meetingId, userId: auth.user.id }
        });

        if (userCandidate) {
            return NextResponse.json({ error: "You can only propose one film per meeting" }, { status: 400 });
        }

        const candidate = await prisma.meetingCandidate.create({
            data: { meetingId, filmId, userId: auth.user.id },
            include: {
                film: true,
                votes: true,
                user: { select: { id: true, name: true, image: true } }
            }
        });

        return NextResponse.json(candidate);
    } catch (error) {
        console.error("Error adding candidate:", error);
        return NextResponse.json({ error: "Failed to add candidate" }, { status: 500 });
    }
}
