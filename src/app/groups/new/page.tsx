import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import GroupsNewClient from "./GroupsNewClient";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
    const t = await getTranslations("groupsNew");
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    return (
        <div className="page page-form">
            <h1 className="page-title">{t("pageTitle")}</h1>
            <GroupsNewClient />
        </div>
    );
}
