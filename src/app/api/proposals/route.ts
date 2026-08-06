import { NextResponse } from "next/server";
import { requireGroupMember, requireSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
    try {
        const auth = await requireSession();
        if (!auth.ok) return auth.response;

        const access = await requireGroupMember(auth.session.user.activeGroupId, auth.session);
        if (!access.ok) return access.response;

        const { searchParams } = new URL(request.url);
        const scope = searchParams.get("scope");

        const whereClause: Prisma.ProposalWhereInput =
            scope === "all"
                ? { groupId: access.group.id }
                : { groupId: access.group.id, userId: access.user.id };

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

export async function POST(request: Request) {
    try {
        const auth = await requireSession();
        if (!auth.ok) return auth.response;

        if (!auth.session.user.activeGroupId) {
            return new NextResponse("No active group", { status: 400 });
        }

        const access = await requireGroupMember(auth.session.user.activeGroupId, auth.session);
        if (!access.ok) return access.response;

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
                userId: access.user.id,
                filmId: film.id,
                groupId: access.group.id
            }
        });

        if (existingProposal) {
            return NextResponse.json(existingProposal);
        }

        const proposal = await prisma.proposal.create({
            data: {
                userId: access.user.id,
                filmId: film.id,
                groupId: access.group.id,
            },
        });

        return NextResponse.json(proposal);

    } catch (error) {
        console.error("[PROPOSALS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
