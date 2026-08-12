"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import styles from "../../settings/settings.module.css";

const ERROR_KEYS: Record<string, "errorLimitReached" | "errorRateLimited"> = {
    group_limit_reached: "errorLimitReached",
    rate_limited: "errorRateLimited",
};

export default function GroupsNewClient() {
    const t = useTranslations("groupsNew");
    const router = useRouter();
    const { update: updateSession } = useSession();

    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            const res = await fetch("/api/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            if (res.ok) {
                const group = await res.json();
                await updateSession();
                router.push(`/g/${group.id}`);
            } else {
                const data = await res.json().catch(() => ({}));
                setError(t(ERROR_KEYS[data.error] ?? "errorDefault"));
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={clsx("glass-card", styles.card)}>
                <label className="field-label" htmlFor="group-name">{t("nameLabel")}</label>
                <input
                    id="group-name"
                    className="input"
                    placeholder={t("namePlaceholder")}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={60}
                    required
                />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
                {saving ? t("creating") : t("create")}
            </button>
        </form>
    );
}
