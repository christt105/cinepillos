import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const proposals = await prisma.proposal.findMany({
            where: {
                userId: session.user.id
            },
            select: {
                id: true,
                film: {
                    select: {
                        tmdbId: true
                    }
                }
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
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { tmdbId, title, overview, posterPath, releaseDate } = body;

        // Basic validation
        if (!tmdbId || !title) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // 1. Ensure Film exists
        const film = await prisma.film.upsert({
            where: { tmdbId: Number(tmdbId) },
            update: {
                title,
                overview,
                posterPath,
                releaseDate,
            },
            create: {
                tmdbId: Number(tmdbId),
                title,
                overview,
                posterPath,
                releaseDate,
            },
        });

        // 2. Create Proposal if not exists
        // The proposal model has a unique constraint @@unique([userId, filmId])
        // So if it exists, it might throw, or we can check first.
        // Let's check first to return a friendly message or just return the existing one.

        const existingProposal = await prisma.proposal.findUnique({
            where: {
                userId_filmId: {
                    userId: session.user.id,
                    filmId: film.id
                }
            }
        });

        if (existingProposal) {
            return NextResponse.json(existingProposal);
        }

        const proposal = await prisma.proposal.create({
            data: {
                userId: session.user.id,
                filmId: film.id,
            },
        });

        return NextResponse.json(proposal);

    } catch (error) {
        console.error("[PROPOSALS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
