import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const meetings = await prisma.meeting.findMany({
            orderBy: { date: 'asc' },
            where: {
                date: { gt: new Date(Date.now() - 86400000) } // Show meetings from yesterday onwards
            },
            include: {
                candidates: {
                    include: {
                        film: true,
                        votes: true,
                        // user include removed as relation does not exist in schema
                    }
                }
            }
        });

        // Manually fetch users for candidates
        const userIds = new Set<string>();
        meetings.forEach(meeting => {
            meeting.candidates.forEach(candidate => {
                if (candidate.userId) {
                    userIds.add(candidate.userId);
                }
            });
        });

        const users = await prisma.user.findMany({
            where: {
                id: { in: Array.from(userIds) }
            },
            select: {
                id: true,
                name: true,
                image: true
            }
        });

        const userMap = new Map(users.map(user => [user.id, user]));

        // Attach users to candidates
        const meetingsWithUsers = meetings.map(meeting => ({
            ...meeting,
            candidates: meeting.candidates.map(candidate => ({
                ...candidate,
                user: userMap.get(candidate.userId) || { name: 'System', image: null, id: candidate.userId }
            }))
        }));

        return NextResponse.json(meetingsWithUsers);
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
        const { date, candidateIds } = body;

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        // Create meeting
        const meeting = await prisma.meeting.create({
            data: {
                date: new Date(date),
                status: "VOTING",
            }
        });

        // Add candidates if any (expecting array of proposal IDs or existing film IDs? 
        // For simplicity let's assume we pass filmIds directly or we link proposals. 
        // The mock UI just showed "Propose a film". 
        // Let's assume for now we just create the meeting, candidates added later?
        // Or if provided, add them.

        return NextResponse.json(meeting);
    } catch (error) {
        console.error("Error creating meeting:", error);
        return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
    }
}
