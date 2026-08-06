import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from "@/lib/schemas";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(
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
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const ext = AVATAR_MIME_TYPES[file.type];
        if (!ext) {
            return NextResponse.json({ error: "unsupported_image_type" }, { status: 400 });
        }

        if (file.size > AVATAR_MAX_BYTES) {
            return NextResponse.json({ error: "image_too_large" }, { status: 400 });
        }

        const filename = `${id}.${ext}`;
        const uploadsDir = join(process.cwd(), "public", "uploads", "avatars");

        await mkdir(uploadsDir, { recursive: true });

        const bytes = await file.arrayBuffer();
        await writeFile(join(uploadsDir, filename), Buffer.from(bytes));

        const imagePath = `/uploads/avatars/${filename}`;

        await prisma.user.update({
            where: { id },
            data: { image: imagePath },
        });

        return NextResponse.json({ image: imagePath });
    } catch (error) {
        console.error("Error uploading avatar:", error);
        return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
    }
}
