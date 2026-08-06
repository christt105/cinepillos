import { prisma } from "@/lib/prisma";
import { requireGroupMember } from "@/lib/auth-guards";
import { activeGroupSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await parseBody(req, activeGroupSchema);
    if (!body.ok) return body.response;

    const auth = await requireGroupMember(body.data.groupId);
    if (!auth.ok) return auth.response;

    try {
        const user = await prisma.user.update({
            where: { id: auth.session.user.id },
            data: {
                activeGroupId: auth.group.id
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error switching active group:", error);
        return NextResponse.json({ error: "Failed to switch group" }, { status: 500 });
    }
}
