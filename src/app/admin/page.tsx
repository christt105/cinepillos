import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    if (!session.user.isAdmin) {
        redirect("/");
    }

    const users = await prisma.user.findMany({
        include: { memberships: { include: { group: true } }, activeGroup: true }
    });

    const groups = await prisma.group.findMany({
        include: { memberships: true }
    });

    return (
        <div>
            <h1 className="page-title">Panel de Administración</h1>
            <AdminClient initialUsers={users} initialGroups={groups} />
        </div>
    );
}
