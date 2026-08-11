import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { avatarUrl } from "@/lib/avatar";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const t = await getTranslations("settings");
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: { id: true, name: true, email: true, image: true }
    });

    if (!user) redirect("/login");

    return (
        <div className="page page-form">
            <h1 className="page-title">{t("pageTitle")}</h1>
            <SettingsClient user={{ ...user, avatar: avatarUrl(user) }} />
        </div>
    );
}
