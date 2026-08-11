"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { avatarUrl } from "@/lib/avatar";
import AvatarPicker from "./AvatarPicker";
import styles from "./settings.module.css";

interface User {
    id: string;
    name: string | null;
    email: string;
    avatar: string;
}

export default function SettingsClient({ user }: { user: User }) {
    const t = useTranslations("settings");
    const tCommon = useTranslations("common");
    const router = useRouter();

    const [name, setName] = useState(user.name || "");
    const [avatar, setAvatar] = useState(user.avatar);
    const [pickingAvatar, setPickingAvatar] = useState(false);
    const [removingAvatar, setRemovingAvatar] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleSave = async () => {
        setError("");
        setSaving(true);
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.error === "name_taken" ? t("errorNameTaken") : t("errorDefault"));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveAvatar = async () => {
        setRemovingAvatar(true);
        try {
            const res = await fetch(`/api/users/${user.id}/avatar`, { method: "DELETE" });
            if (res.ok) {
                setAvatar(avatarUrl({ image: null }));
                router.refresh();
            }
        } finally {
            setRemovingAvatar(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
            if (res.ok) {
                await signOut({ callbackUrl: "/" });
            } else {
                setDeleting(false);
            }
        } catch {
            setDeleting(false);
        }
    };

    return (
        <div className={styles.form}>
            <div className={clsx("glass-card", styles.identity)}>
                <div className={clsx("avatar", styles.identityAvatar)}>
                    <Image src={avatar} alt={name} fill className={styles.identityImage} />
                </div>
                <div>
                    <h2 className={styles.identityName}>{name || t("noName")}</h2>
                    <p className={styles.identityEmail}>{user.email}</p>
                    <div className={styles.avatarActions}>
                        <button className="btn btn-ghost" onClick={() => setPickingAvatar(true)}>
                            {t("changeAvatar")}
                        </button>
                        <button className="btn btn-ghost" onClick={handleRemoveAvatar} disabled={removingAvatar}>
                            {t("removeAvatar")}
                        </button>
                    </div>
                </div>
            </div>

            {pickingAvatar && (
                <AvatarPicker
                    userId={user.id}
                    onSelected={path => {
                        setAvatar(avatarUrl({ image: path }));
                        setPickingAvatar(false);
                        router.refresh();
                    }}
                    onClose={() => setPickingAvatar(false)}
                />
            )}

            <div className={clsx("glass-card", styles.card)}>
                <h3 className={styles.cardTitle}>{t("nameLabel")}</h3>
                <input
                    className="input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
                className={clsx("btn btn-primary", styles.save)}
                onClick={handleSave}
                disabled={saving}
            >
                {saved ? <><Check size={18} /> {t("saved")}</> : saving ? t("saving") : t("save")}
            </button>

            <div className={clsx("glass-card", styles.card, styles.dangerZone)}>
                <h3 className={styles.cardTitle}>{t("deleteTitle")}</h3>
                <p className={styles.dangerText}>
                    {t.rich("deleteText", {
                        privacy: chunks => <Link href="/privacy">{chunks}</Link>,
                    })}
                </p>
                {confirmingDelete ? (
                    <div className={styles.dangerActions}>
                        <button
                            className="btn btn-danger"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? t("deleting") : t("confirmDelete")}
                        </button>
                        <button
                            className="btn btn-ghost"
                            onClick={() => setConfirmingDelete(false)}
                            disabled={deleting}
                        >
                            {tCommon("cancel")}
                        </button>
                    </div>
                ) : (
                    <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
                        {t("delete")}
                    </button>
                )}
            </div>
        </div>
    );
}
