"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import styles from "./admin.module.css";

type AdminUser = {
    id: string;
    name: string | null;
    email: string;
    isAdmin: boolean;
    memberships: { group: { name: string } }[];
};

type AdminGroup = {
    id: string;
    name: string;
    memberships: unknown[];
};

export default function AdminClient({ initialUsers, initialGroups }: { initialUsers: AdminUser[], initialGroups: AdminGroup[] }) {
    const t = useTranslations("admin");
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [msg, setMsg] = useState("");

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email }),
        });
        if (res.ok) {
            setMsg(t("userCreated"));
            setName(""); setEmail("");
            router.refresh();
        } else {
            const data = await res.json();
            setMsg(t("createError", { message: data.error }));
        }
        setTimeout(() => setMsg(""), 3000);
    };

    const handleAssignGroup = async (userId: string, groupId: string) => {
        await fetch(`/api/admin/users/${userId}/groups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId }),
        });
        router.refresh();
    };

    const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
        await fetch(`/api/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isAdmin: !isAdmin }),
        });
        router.refresh();
    };

    return (
        <div className={styles.columns}>
            <div className={clsx("glass-card", styles.column)}>
                <h2>{t("createUser")}</h2>
                <form onSubmit={handleCreateUser} className={styles.form}>
                    <input className="input" placeholder={t("namePlaceholder")} value={name} onChange={e => setName(e.target.value)} required />
                    <input className="input" type="email" placeholder={t("emailPlaceholder")} value={email} onChange={e => setEmail(e.target.value)} required />
                    <button className="btn btn-primary" type="submit">{t("create")}</button>
                    {msg && <p className={styles.message}>{msg}</p>}
                </form>

                <h3 className={styles.listTitle}>{t("usersTitle", { count: initialUsers.length })}</h3>
                <ul className={styles.list}>
                    {initialUsers.map(u => (
                        <li key={u.id} className={styles.item}>
                            <div className={styles.itemHeader}>
                                <div>
                                    <strong>{u.name}</strong>
                                    {u.email && <span className={styles.email}> ({u.email})</span>}
                                    {u.isAdmin && <span className={styles.adminTag}>admin</span>}
                                </div>
                                <button
                                    className={clsx("btn btn-ghost", styles.smallAction)}
                                    onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                                >
                                    {u.isAdmin ? t("removeAdmin") : t("makeAdmin")}
                                </button>
                            </div>
                            <div className={styles.itemRow}>
                                <select
                                    className={clsx("input", styles.groupSelect)}
                                    onChange={(e) => handleAssignGroup(u.id, e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>{t("addToGroup")}</option>
                                    {initialGroups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.groups}>
                                {t("userGroups", { names: u.memberships.map(m => m.group.name).join(", ") || "—" })}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className={clsx("glass-card", styles.column)}>
                <h2>{t("groupsTitle")}</h2>
                <p className={styles.message}>{t("groupsNote")}</p>

                <h3 className={styles.listTitle}>{t("groupsCount", { count: initialGroups.length })}</h3>
                <ul className={styles.listTight}>
                    {initialGroups.map(g => (
                        <li key={g.id} className={styles.item}>
                            <strong>{g.name}</strong> <span className={styles.email}>{t("membersCount", { count: g.memberships.length })}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
