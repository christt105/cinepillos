import { requireGroupPage, rememberLastGroup } from "@/lib/group-page";

export const dynamic = "force-dynamic";

export default async function GroupLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    const { session } = await requireGroupPage(groupId);

    await rememberLastGroup(session, groupId);

    return <>{children}</>;
}
