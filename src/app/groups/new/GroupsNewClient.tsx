"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import styles from "../../settings/settings.module.css";

const ERROR_MESSAGES: Record<string, string> = {
    group_limit_reached: "Has alcanzado el número máximo de clubes que puedes crear.",
    rate_limited: "Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.",
};

export default function GroupsNewClient() {
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
                setError(ERROR_MESSAGES[data.error] ?? "No se ha podido crear el club");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={clsx("glass-card", styles.card)}>
                <label className="field-label" htmlFor="group-name">Nombre del club</label>
                <input
                    id="group-name"
                    className="input"
                    placeholder="Los Cinéfilos del Jueves"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={60}
                    required
                />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
                {saving ? "Creando..." : "Crear club"}
            </button>
        </form>
    );
}
