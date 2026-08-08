"use client";

import { useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import styles from "./settings.module.css";

interface User {
    id: string;
    name: string | null;
    email: string;
    avatar: string;
}

const ERROR_MESSAGES: Record<string, string> = {
    name_taken: "Ese nombre ya está en uso",
};

export default function SettingsClient({ user }: { user: User }) {
    const router = useRouter();

    const [name, setName] = useState(user.name || "");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

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
                setError(ERROR_MESSAGES[data.error] ?? "Error guardando los cambios");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.form}>
            <div className={clsx("glass-card", styles.identity)}>
                <div className={clsx("avatar", styles.identityAvatar)}>
                    <Image src={user.avatar} alt={name} fill className={styles.identityImage} />
                </div>
                <div>
                    <h2 className={styles.identityName}>{name || "Sin nombre"}</h2>
                    <p className={styles.identityEmail}>{user.email}</p>
                </div>
            </div>

            <div className={clsx("glass-card", styles.card)}>
                <h3 className={styles.cardTitle}>Nombre</h3>
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
                {saved ? <><Check size={18} /> Guardado</> : saving ? "Guardando..." : "Guardar cambios"}
            </button>
        </div>
    );
}
