import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminUserUpdateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await parseBody(req, adminUserUpdateSchema);
    if (!body.ok) return body.response;

    try {
        const { userId } = await params;
        const { name, email, isAdmin } = body.data;

        const data: Prisma.UserUpdateInput = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (isAdmin !== undefined) data.isAdmin = isAdmin;

        const user = await prisma.user.update({
            where: { id: userId },
            data,
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error updating user as admin:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 400 });
    }
}
