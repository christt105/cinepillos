import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { userUpdateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { Prisma } from "@prisma/client";
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

    const body = await parseBody(request, userUpdateSchema);
    if (!body.ok) return body.response;

    try {
        const { name, image, currentPassword, newPassword } = body.data;

        const data: Prisma.UserUpdateInput = {};
        if (name !== undefined) {
            const existing = await prisma.user.findFirst({ where: { name, NOT: { id } } });
            if (existing) return NextResponse.json({ error: "name_taken" }, { status: 409 });
            data.name = name;
        }
        if (image !== undefined) data.image = image;
        if (newPassword) {
            if (session.user.id === id) {
                const current = await prisma.user.findUnique({ where: { id } });
                if (current?.password) {
                    if (!currentPassword) {
                        return NextResponse.json({ error: "current_password_required" }, { status: 400 });
                    }
                    const matches = await bcrypt.compare(currentPassword, current.password);
                    if (!matches) {
                        return NextResponse.json({ error: "current_password_invalid" }, { status: 403 });
                    }
                }
            }
            data.password = await bcrypt.hash(newPassword, 10);
        }

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
