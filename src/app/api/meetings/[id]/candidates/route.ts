import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: meetingId } = await params;
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
            where: { meetingId, userId: session.user.id }
        });

        if (userCandidate) {
            return NextResponse.json({ error: "You can only propose one film per meeting" }, { status: 400 });
        }

        const candidate = await prisma.meetingCandidate.create({
            data: { meetingId, filmId, userId: session.user.id },
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
