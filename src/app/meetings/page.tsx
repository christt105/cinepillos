import { redirect } from "next/navigation";
import { resolveLandingGroupId } from "@/lib/group-page";

export const dynamic = "force-dynamic";

export default async function LegacyMeetingsPage() {
    const groupId = await resolveLandingGroupId();

    redirect(groupId ? `/g/${groupId}/meetings` : "/");
}
