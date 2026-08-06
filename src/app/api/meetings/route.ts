import { prisma } from "@/lib/prisma";
import { requireGroupMember, requireSession } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const auth = await requireSession();
        if (!auth.ok) return auth.response;

        if (!auth.session.user.activeGroupId) {
            return NextResponse.json([]);
        }

        const access = await requireGroupMember(auth.session.user.activeGroupId, auth.session);
        if (!access.ok) return access.response;

        const meetings = await prisma.meeting.findMany({
            orderBy: { date: 'asc' },
            where: {
                date: { gt: new Date(Date.now() - 86400000) },
                groupId: access.group.id
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
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json();
        const { date } = body;

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        if (!auth.session.user.activeGroupId) {
            return NextResponse.json({ error: "No active group selected" }, { status: 400 });
        }

        const access = await requireGroupMember(auth.session.user.activeGroupId, auth.session);
        if (!access.ok) return access.response;

        const meeting = await prisma.meeting.create({
            data: {
                date: new Date(date),
                status: "VOTING",
                groupId: access.group.id,
            }
        });

        return NextResponse.json(meeting);
    } catch (error) {
        console.error("Error creating meeting:", error);
        return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
    }
}
