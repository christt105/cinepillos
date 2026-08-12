import { prisma } from "@/lib/prisma";
import { requireGroupMember } from "@/lib/auth-guards";
import { recentMeetingCutoff } from "@/lib/meetings";
import { meetingSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ groupId: string }> };

export async function GET(request: Request, { params }: Context) {
    try {
        const { groupId } = await params;

        const auth = await requireGroupMember(groupId);
        if (!auth.ok) return auth.response;

        const meetings = await prisma.meeting.findMany({
            orderBy: { date: { sort: 'asc', nulls: 'first' } },
            where: {
                // A meeting still in PLANNING has no date yet, so it can never
                // fall out of the window the way a past meeting does.
                OR: [{ date: { gt: recentMeetingCutoff() } }, { date: null }],
                groupId: auth.group.id
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

export async function POST(request: Request, { params }: Context) {
    const { groupId } = await params;

    const auth = await requireGroupMember(groupId);
    if (!auth.ok) return auth.response;

    const body = await parseBody(request, meetingSchema);
    if (!body.ok) return body.response;

    const date = body.data.date ?? null;

    try {
        const meeting = await prisma.meeting.create({
            data: {
                date,
                status: date ? "VOTING" : "PLANNING",
                groupId: auth.group.id,
            }
        });

        return NextResponse.json(meeting);
    } catch (error) {
        console.error("Error creating meeting:", error);
        return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
    }
}
