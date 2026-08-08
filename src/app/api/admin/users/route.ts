import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminUserCreateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await parseBody(req, adminUserCreateSchema);
    if (!body.ok) return body.response;

    try {
        const { name, email } = body.data;

        const user = await prisma.user.create({
            data: { name, email },
        });

        return NextResponse.json(user);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
