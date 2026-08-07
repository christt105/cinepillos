import { redirect } from "next/navigation";
import { resolveLandingGroupId } from "@/lib/group-page";

export const dynamic = "force-dynamic";

export default async function LegacyMoviePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const groupId = await resolveLandingGroupId();

    redirect(groupId ? `/g/${groupId}/movies/${id}` : "/");
}
