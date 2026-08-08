"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [groupName, setGroupName] = useState("");
    const [msg, setMsg] = useState("");

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email }),
        });
        if (res.ok) {
            setMsg("Usuario creado");
            setName(""); setEmail("");
            router.refresh();
        } else {
            const data = await res.json();
            setMsg(`Error: ${data.error}`);
        }
        setTimeout(() => setMsg(""), 3000);
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/admin/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: groupName }),
        });
        setGroupName("");
        router.refresh();
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
                <h2>Crear Usuario</h2>
                <form onSubmit={handleCreateUser} className={styles.form}>
                    <input className="input" placeholder="Nombre *" value={name} onChange={e => setName(e.target.value)} required />
                    <input className="input" type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} required />
                    <button className="btn btn-primary" type="submit">Crear</button>
                    {msg && <p className={styles.message}>{msg}</p>}
                </form>

                <h3 className={styles.listTitle}>Usuarios ({initialUsers.length})</h3>
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
                                    {u.isAdmin ? "Quitar admin" : "Hacer admin"}
                                </button>
                            </div>
                            <div className={styles.itemRow}>
                                <select
                                    className={clsx("input", styles.groupSelect)}
                                    onChange={(e) => handleAssignGroup(u.id, e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Añadir a grupo...</option>
                                    {initialGroups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.groups}>
                                Grupos: {u.memberships.map(m => m.group.name).join(", ") || "—"}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className={clsx("glass-card", styles.column)}>
                <h2>Crear Grupo</h2>
                <form onSubmit={handleCreateGroup} className={styles.form}>
                    <input className="input" placeholder="Nombre del grupo *" value={groupName} onChange={e => setGroupName(e.target.value)} required />
                    <button className="btn btn-primary" type="submit">Crear</button>
                </form>

                <h3 className={styles.listTitle}>Grupos ({initialGroups.length})</h3>
                <ul className={styles.listTight}>
                    {initialGroups.map(g => (
                        <li key={g.id} className={styles.item}>
                            <strong>{g.name}</strong> <span className={styles.email}>({g.memberships.length} miembros)</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
