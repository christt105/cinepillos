import { NextResponse } from "next/server";
import { requireGroupMember } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { Prisma } from "@prisma/client";

type Context = { params: Promise<{ groupId: string }> };

export async function GET(request: Request, { params }: Context) {
    try {
        const { groupId } = await params;

        const auth = await requireGroupMember(groupId);
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const scope = searchParams.get("scope");

        const whereClause: Prisma.ProposalWhereInput =
            scope === "all"
                ? { groupId: auth.group.id }
                : { groupId: auth.group.id, userId: auth.user.id };

        const proposals = await prisma.proposal.findMany({
            where: whereClause,
            include: {
                film: true, // Include full film details for 'all' scope
                user: true  // Include proposer details
            }
        });

        return NextResponse.json(proposals);
    } catch (error) {
        console.error("[PROPOSALS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(request: Request, { params }: Context) {
    try {
        const { groupId } = await params;

        const auth = await requireGroupMember(groupId);
        if (!auth.ok) return auth.response;

        const body = await parseBody(request, proposalSchema);
        if (!body.ok) return body.response;

        const { tmdbId, title, overview, posterPath, releaseDate } = body.data;

        // 1. Ensure Film exists
        const film = await prisma.film.upsert({
            where: { tmdbId },
            update: {
                title,
                overview,
                posterPath,
                releaseDate,
            },
            create: {
                tmdbId,
                title,
                overview,
                posterPath,
                releaseDate,
            },
        });

        // 2. Create Proposal if not exists
        const existingProposal = await prisma.proposal.findFirst({
            where: {
                userId: auth.user.id,
                filmId: film.id,
                groupId: auth.group.id
            }
        });

        if (existingProposal) {
            return NextResponse.json(existingProposal);
        }

        const proposal = await prisma.proposal.create({
            data: {
                userId: auth.user.id,
                filmId: film.id,
                groupId: auth.group.id,
            },
        });

        return NextResponse.json(proposal);

    } catch (error) {
        console.error("[PROPOSALS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
