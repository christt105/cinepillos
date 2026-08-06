import { prisma } from "@/lib/prisma";
import { requireGroupMember } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { groupId } = await req.json();

        const auth = await requireGroupMember(groupId);
        if (!auth.ok) return auth.response;

        const user = await prisma.user.update({
            where: { id: auth.session.user.id },
            data: {
                activeGroupId: auth.group.id
            }
        });

        return NextResponse.json(user);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
