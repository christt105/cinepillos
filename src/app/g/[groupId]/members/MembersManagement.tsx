"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2, LogOut } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import clsx from "clsx";
import styles from "./management.module.css";

type Member = { userId: string; name: string | null; role: string };
type Invitation = {
    id: string;
    token: string;
    expiresAt: string;
    maxUses: number | null;
    useCount: number;
};

export default function MembersManagement({
    groupId,
    currentUserId,
    isOwnerOrAdmin,
    members,
    initialInvitations,
}: {
    groupId: string;
    currentUserId: string;
    isOwnerOrAdmin: boolean;
    members: Member[];
    initialInvitations: Invitation[];
}) {
    const t = useTranslations("members");
    const format = useFormatter();
    const router = useRouter();
    const [invitations, setInvitations] = useState(initialInvitations);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    const handleCreateInvitation = async () => {
        setError("");
        setCreating(true);
        try {
            const res = await fetch(`/api/groups/${groupId}/invitations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expiresInDays: 7 }),
            });
            if (res.ok) {
                const invitation = await res.json();
                setInvitations(prev => [invitation, ...prev]);
            } else {
                setError(t("createInvitationError"));
            }
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (invitationId: string) => {
        const res = await fetch(`/api/groups/${groupId}/invitations/${invitationId}`, { method: "DELETE" });
        if (res.ok) {
            setInvitations(prev => prev.filter(i => i.id !== invitationId));
        }
    };

    const handleCopyLink = (token: string) => {
        const url = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(url);
    };

    const handleRemoveMember = async (userId: string) => {
        const isSelf = userId === currentUserId;
        if (isSelf && !confirm(t("confirmLeave"))) return;
        if (!isSelf && !confirm(t("confirmKick"))) return;

        const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
        if (res.ok) {
            router.push(isSelf ? "/" : `/g/${groupId}/members`);
            router.refresh();
        }
    };

    return (
        <div className={clsx("glass-card", styles.card)}>
            {isOwnerOrAdmin && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>{t("inviteByLink")}</h3>
                    <button className="btn btn-ghost" onClick={handleCreateInvitation} disabled={creating}>
                        {creating ? t("creatingInvitation") : t("createInvitation")}
                    </button>
                    {error && <p className="form-error">{error}</p>}

                    {invitations.length > 0 && (
                        <ul className={styles.invitationList}>
                            {invitations.map(invitation => (
                                <li key={invitation.id} className={styles.invitationItem}>
                                    <span className={styles.invitationMeta}>
                                        {t("invitationExpires", {
                                            date: format.dateTime(new Date(invitation.expiresAt), "short"),
                                        })}
                                        {invitation.maxUses
                                            ? t("invitationUsesCapped", { used: invitation.useCount, max: invitation.maxUses })
                                            : t("invitationUses", { used: invitation.useCount })}
                                    </span>
                                    <button
                                        className="btn btn-ghost"
                                        title={t("copyLink")}
                                        onClick={() => handleCopyLink(invitation.token)}
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        className="btn btn-ghost"
                                        title={t("revoke")}
                                        onClick={() => handleRevoke(invitation.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>{t("membersTitle")}</h3>
                <ul className={styles.memberList}>
                    {members.map(member => (
                        <li key={member.userId} className={styles.memberItem}>
                            <span>
                                {member.name} {member.role === "OWNER" && <span className={styles.role}>{t("owner")}</span>}
                            </span>
                            {(member.userId === currentUserId || isOwnerOrAdmin) && member.role !== "OWNER" && (
                                <button
                                    className="btn btn-ghost"
                                    title={member.userId === currentUserId ? t("leaveClub") : t("kickMember")}
                                    onClick={() => handleRemoveMember(member.userId)}
                                >
                                    {member.userId === currentUserId ? <LogOut size={16} /> : <Trash2 size={16} />}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
