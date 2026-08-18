import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireGroupOwner } from "@/lib/auth-guards";
import { groupUpdateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";

/** Owner (or a site admin) renames the group. */
export async function PATCH(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    const auth = await requireGroupOwner(groupId);
    if (!auth.ok) return auth.response;

    const body = await parseBody(req, groupUpdateSchema);
    if (!body.ok) return body.response;

    const updated = await prisma.group.update({
        where: { id: groupId },
        data: { name: body.data.name },
    });

    return NextResponse.json(updated);
}

/**
 * Owner (or a site admin) deletes the group. Memberships, invitations,
 * proposals and meetings go with it through the schema's cascades, and the
 * `activeGroupId` of anyone parked on it is set to null by its foreign key.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    const auth = await requireGroupOwner(groupId);
    if (!auth.ok) return auth.response;

    await prisma.group.delete({ where: { id: groupId } });

    return NextResponse.json({ deleted: true });
}
