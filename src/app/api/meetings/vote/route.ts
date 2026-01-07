import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { candidateId } = body;

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if vote exists
        const existingVote = await prisma.vote.findUnique({
            where: {
                candidateId_userId: {
                    candidateId,
                    userId: user.id
                }
            }
        });

        if (existingVote) {
            // Remove vote (Toggle)
            await prisma.vote.delete({
                where: { id: existingVote.id }
            });
            return NextResponse.json({ voted: false });
        } else {
            // Add vote
            await prisma.vote.create({
                data: {
                    candidateId,
                    userId: user.id
                }
            });
            return NextResponse.json({ voted: true });
        }
    } catch (error) {
        console.error("Error voting:", error);
        return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
    }
}
