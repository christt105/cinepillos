import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { findInvitationGroup, resolveInvitationState } from "@/lib/invitations";
import { SITE_NAME, socialMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/i18n/request";
import AcceptInviteButton from "./AcceptInviteButton";

export const dynamic = "force-dynamic";

/** Message pair explaining why a link cannot be used, one per refused state. */
const MESSAGES = {
    not_found: { title: "notFoundTitle", text: "notFoundText" },
    revoked: { title: "revokedTitle", text: "revokedText" },
    expired: { title: "expiredTitle", text: "expiredText" },
    used_up: { title: "usedUpTitle", text: "usedUpText" },
    group_full: { title: "groupFullTitle", text: "groupFullText" },
} as const;

/**
 * Runs even for visitors the page itself would bounce to `/login`, so the link
 * still previews with the name of the club someone is being invited to.
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
    const { token } = await params;
    const [group, t, locale] = await Promise.all([
        findInvitationGroup(token),
        getTranslations("invite"),
        resolveLocale(),
    ]);

    if (!group) {
        return socialMetadata({
            title: t("metaTitle", { app: SITE_NAME }),
            description: t("metaDescriptionInvalid"),
            locale,
        });
    }

    return socialMetadata({
        title: t("metaTitleValid", { group: group.name }),
        description: t("metaDescriptionValid", { group: group.name, app: SITE_NAME }),
        locale,
    });
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const t = await getTranslations("invite");
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
    }

    const state = await resolveInvitationState(token, session.user.id);

    if (state.status === "already_member") {
        redirect(`/g/${state.group.id}`);
    }

    if (state.status === "valid") {
        return (
            <div className="glass-card notice">
                <h2 className="notice-title">{t("title", { group: state.group.name })}</h2>
                <p className="notice-text">{t("text")}</p>
                <AcceptInviteButton token={token} />
            </div>
        );
    }

    const message = MESSAGES[state.status];

    return (
        <div className="glass-card notice">
            <h2 className="notice-title">{t(message.title)}</h2>
            <p className="notice-text">{t(message.text)}</p>
        </div>
    );
}
