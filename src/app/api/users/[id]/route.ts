import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    if (session.user.id !== id && !session.user.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, image, newPassword } = body;

        const data: Record<string, unknown> = {};
        if (name !== undefined) {
            const existing = await prisma.user.findFirst({ where: { name, NOT: { id } } });
            if (existing) return NextResponse.json({ error: "name_taken" }, { status: 409 });
            data.name = name;
        }
        if (image !== undefined) data.image = image;
        if (newPassword) data.password = await bcrypt.hash(newPassword, 10);

        const updatedUser = await prisma.user.update({
            where: { id },
            data,
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
