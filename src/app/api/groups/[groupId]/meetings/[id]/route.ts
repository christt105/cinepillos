import { prisma } from "@/lib/prisma";
import { requireMeetingMember } from "@/lib/auth-guards";
import { meetingScheduleSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { NextResponse } from "next/server";

/** Puts a date on a meeting still in PLANNING and moves it to VOTING. */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ groupId: string; id: string }> }
) {
    try {
        const { groupId, id: meetingId } = await params;

        const auth = await requireMeetingMember(meetingId, groupId);
        if (!auth.ok) return auth.response;

        if (auth.meeting.status !== "PLANNING") {
            return NextResponse.json({ error: "Meeting is not in planning phase" }, { status: 400 });
        }

        const body = await parseBody(request, meetingScheduleSchema);
        if (!body.ok) return body.response;

        const meeting = await prisma.meeting.update({
            where: { id: meetingId },
            data: { date: body.data.date, status: "VOTING" }
        });

        return NextResponse.json(meeting);
    } catch (error) {
        console.error("Error scheduling meeting:", error);
        return NextResponse.json({ error: "Failed to schedule meeting" }, { status: 500 });
    }
}
