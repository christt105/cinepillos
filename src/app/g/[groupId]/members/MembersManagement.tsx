"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2, LogOut, Crown } from "lucide-react";
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

const errorMessage = async (res: Response, fallback: string, lastOwnerMessage?: string) => {
    const body = await res.json().catch(() => null);

    if (body?.error === "last_owner" && lastOwnerMessage) {
        return lastOwnerMessage;
    }

    return fallback;
};

export default function MembersManagement({
    groupId,
    groupName,
    currentUserId,
    isOwnerOrAdmin,
    members,
    initialInvitations,
}: {
    groupId: string;
    groupName: string;
    currentUserId: string;
    isOwnerOrAdmin: boolean;
    members: Member[];
    initialInvitations: Invitation[];
}) {
    const t = useTranslations("members");
    const tCommon = useTranslations("common");
    const format = useFormatter();
    const router = useRouter();
    const [invitations, setInvitations] = useState(initialInvitations);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [name, setName] = useState(groupName);
    const [renaming, setRenaming] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleting, setDeleting] = useState(false);

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

        setError("");
        const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
        if (res.ok) {
            router.push(isSelf ? "/" : `/g/${groupId}/members`);
            router.refresh();
        } else {
            setError(await errorMessage(res, t("errorRemoveMember"), t("lastOwnerError")));
        }
    };

    const handleTransfer = async (userId: string, memberName: string | null) => {
        if (!confirm(t("confirmTransfer", { name: memberName ?? t("thisMember") }))) return;

        setError("");
        const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "OWNER" }),
        });
        if (res.ok) {
            router.refresh();
        } else {
            setError(await errorMessage(res, t("errorTransfer")));
        }
    };

    const handleRename = async () => {
        setError("");
        setRenaming(true);
        try {
            const res = await fetch(`/api/groups/${groupId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                router.refresh();
            } else {
                setError(await errorMessage(res, t("errorRename")));
            }
        } finally {
            setRenaming(false);
        }
    };

    const handleDeleteGroup = async () => {
        setError("");
        setDeleting(true);
        try {
            const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/");
                router.refresh();
            } else {
                setError(await errorMessage(res, t("errorDelete")));
                setDeleting(false);
            }
        } catch {
            setError(t("errorDelete"));
            setDeleting(false);
        }
    };

    return (
        <div className={clsx("glass-card", styles.card)}>
            {isOwnerOrAdmin && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>{t("renameSectionTitle")}</h3>
                    <div className={styles.renameRow}>
                        <input
                            className="input"
                            value={name}
                            maxLength={60}
                            onChange={event => setName(event.target.value)}
                            aria-label={t("renameSectionTitle")}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleRename}
                            disabled={renaming || !name.trim() || name === groupName}
                        >
                            {renaming ? t("saving") : t("save")}
                        </button>
                    </div>
                </section>
            )}

            {isOwnerOrAdmin && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>{t("inviteByLink")}</h3>
                    <button className="btn btn-ghost" onClick={handleCreateInvitation} disabled={creating}>
                        {creating ? t("creatingInvitation") : t("createInvitation")}
                    </button>

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
                            <span className={styles.memberActions}>
                                {isOwnerOrAdmin && member.role !== "OWNER" && (
                                    <button
                                        className="btn btn-ghost"
                                        title={t("makeOwner")}
                                        onClick={() => handleTransfer(member.userId, member.name)}
                                    >
                                        <Crown size={16} />
                                    </button>
                                )}
                                {(member.userId === currentUserId || isOwnerOrAdmin) && member.role !== "OWNER" && (
                                    <button
                                        className="btn btn-ghost"
                                        title={member.userId === currentUserId ? t("leaveClub") : t("kickMember")}
                                        onClick={() => handleRemoveMember(member.userId)}
                                    >
                                        {member.userId === currentUserId ? <LogOut size={16} /> : <Trash2 size={16} />}
                                    </button>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            {isOwnerOrAdmin && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>{t("deleteSectionTitle")}</h3>
                    <p className={styles.dangerNote}>{t("deleteWarning")}</p>
                    {confirmingDelete ? (
                        <div className={styles.dangerConfirm}>
                            <label className={styles.dangerLabel} htmlFor="delete-confirmation">
                                {t.rich("deleteConfirmLabel", {
                                    name: groupName,
                                    strong: chunks => <strong>{chunks}</strong>,
                                })}
                            </label>
                            <input
                                id="delete-confirmation"
                                className="input"
                                value={deleteConfirmation}
                                onChange={event => setDeleteConfirmation(event.target.value)}
                            />
                            <div className={styles.dangerActions}>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleDeleteGroup}
                                    disabled={deleting || deleteConfirmation !== groupName}
                                >
                                    {deleting ? t("deleting") : t("deleteConfirmButton")}
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setConfirmingDelete(false);
                                        setDeleteConfirmation("");
                                    }}
                                >
                                    {tCommon("cancel")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
                            {t("deleteClubButton")}
                        </button>
                    )}
                </section>
            )}

            {error && <p className="form-error">{error}</p>}
        </div>
    );
}
