import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.activeGroupId) {
            return NextResponse.json([]);
        }

        const meetings = await prisma.meeting.findMany({
            orderBy: { date: 'asc' },
            where: {
                date: { gt: new Date(Date.now() - 86400000) },
                groupId: session.user.activeGroupId
            },
            include: {
                candidates: {
                    include: {
                        film: true,
                        votes: true,
                        user: {
                            select: { id: true, name: true, image: true }
                        }
                    }
                }
            }
        });

        return NextResponse.json(meetings);
    } catch (error) {
        console.error("Error fetching meetings:", error);
        return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { date } = body;

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        if (!session.user.activeGroupId) {
            return NextResponse.json({ error: "No active group selected" }, { status: 400 });
        }

        const meeting = await prisma.meeting.create({
            data: {
                date: new Date(date),
                status: "VOTING",
                groupId: session.user.activeGroupId,
            }
        });

        return NextResponse.json(meeting);
    } catch (error) {
        console.error("Error creating meeting:", error);
        return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
    }
}
