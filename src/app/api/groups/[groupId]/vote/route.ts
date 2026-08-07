import { prisma } from "@/lib/prisma";
import { requireCandidateMember } from "@/lib/auth-guards";
import { voteSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const { groupId } = await params;

    const body = await parseBody(request, voteSchema);
    if (!body.ok) return body.response;

    const { candidateId } = body.data;

    try {
        const auth = await requireCandidateMember(candidateId, groupId);
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
