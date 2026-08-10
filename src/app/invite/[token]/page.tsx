import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { findInvitationGroup, resolveInvitationState } from "@/lib/invitations";
import { SITE_NAME, socialMetadata } from "@/lib/metadata";
import AcceptInviteButton from "./AcceptInviteButton";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { title: string; text: string }> = {
    not_found: {
        title: "Este enlace no existe",
        text: "El enlace de invitación no es válido. Pide uno nuevo a quien te invitó.",
    },
    revoked: {
        title: "Invitación revocada",
        text: "Quien te invitó ha revocado este enlace. Pide uno nuevo.",
    },
    expired: {
        title: "Invitación caducada",
        text: "Este enlace de invitación ha caducado. Pide uno nuevo.",
    },
    used_up: {
        title: "Invitación agotada",
        text: "Este enlace ya se ha usado el máximo de veces permitido.",
    },
    group_full: {
        title: "El club está lleno",
        text: "Este club ya tiene el máximo de 30 miembros.",
    },
};

/**
 * Runs even for visitors the page itself would bounce to `/login`, so the link
 * still previews with the name of the club someone is being invited to.
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
    const { token } = await params;
    const group = await findInvitationGroup(token);

    if (!group) {
        return socialMetadata({
            title: `Invitación · ${SITE_NAME}`,
            description: "Este enlace de invitación ya no es válido.",
        });
    }

    return socialMetadata({
        title: `Te han invitado a ${group.name}`,
        description: `Únete a ${group.name} en ${SITE_NAME} para proponer películas y votar en las sesiones.`,
    });
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
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
                <h2 className="notice-title">Te han invitado a {state.group.name}</h2>
                <p className="notice-text">Únete para proponer películas y votar en las sesiones.</p>
                <AcceptInviteButton token={token} />
            </div>
        );
    }

    const message = MESSAGES[state.status];

    return (
        <div className="glass-card notice">
            <h2 className="notice-title">{message.title}</h2>
            <p className="notice-text">{message.text}</p>
        </div>
    );
}
