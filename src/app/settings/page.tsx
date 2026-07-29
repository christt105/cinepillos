import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: { id: true, name: true, email: true, image: true }
    });

    if (!user) redirect("/login");

    return (
        <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "4rem" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>Mi perfil</h1>
            <SettingsClient user={user} />
        </div>
    );
}
