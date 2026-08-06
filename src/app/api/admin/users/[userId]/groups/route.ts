import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { groupId } = await req.json();
        const { userId } = await params;

        const membership = await prisma.membership.create({
            data: {
                userId,
                groupId,
                role: "MEMBER",
            }
        });

        return NextResponse.json(membership);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
