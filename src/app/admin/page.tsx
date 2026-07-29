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
        include: { families: true, activeFamily: true }
    });

    const families = await prisma.family.findMany({
        include: { users: true }
    });

    return (
        <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Panel de Administración</h1>
            <AdminClient initialUsers={users} initialFamilies={families} />
        </div>
    );
}
