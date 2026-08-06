import { prisma } from "@/lib/prisma";
import { requireCandidateMember } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { candidateId } = body;

        if (!candidateId) {
            return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
        }

        const auth = await requireCandidateMember(candidateId);
        if (!auth.ok) return auth.response;

        // Check if vote exists
        const existingVote = await prisma.vote.findUnique({
            where: {
                candidateId_userId: {
                    candidateId,
                    userId: auth.user.id
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
                    userId: auth.user.id
                }
            });
            return NextResponse.json({ voted: true });
        }
    } catch (error) {
        console.error("Error voting:", error);
        return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
    }
}
