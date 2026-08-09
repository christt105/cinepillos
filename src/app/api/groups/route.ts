import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-guards";
import { groupCreateSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

const OWNED_GROUPS_LIMIT_REGULAR = 3;
const OWNED_GROUPS_LIMIT_ADMIN = 100;

/** Anyone authenticated can create a club; the creator becomes its OWNER. */
export async function POST(req: Request) {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const { session } = auth;

    if (!rateLimit(`group-create:${session.user.id}`, 5, 10 * 60 * 1000)) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = await parseBody(req, groupCreateSchema);
    if (!body.ok) return body.response;

    const ownedCount = await prisma.membership.count({
        where: { userId: session.user.id, role: "OWNER" },
    });
    const limit = session.user.isAdmin ? OWNED_GROUPS_LIMIT_ADMIN : OWNED_GROUPS_LIMIT_REGULAR;
    if (ownedCount >= limit) {
        return NextResponse.json({ error: "group_limit_reached" }, { status: 403 });
    }

    // Not wrapped in an interactive $transaction: Neon's pooled connection
    // (DATABASE_URL) runs PgBouncer in transaction-pooling mode, which does
    // not support Prisma holding one connection open across these calls. A
    // crash between them just leaves a harmless ownerless group.
    const newGroup = await prisma.group.create({ data: { name: body.data.name } });

    await prisma.membership.create({
        data: { userId: session.user.id, groupId: newGroup.id, role: "OWNER" },
    });

    await prisma.user.update({
        where: { id: session.user.id },
        data: { activeGroupId: newGroup.id },
    });

    return NextResponse.json(newGroup);
}
