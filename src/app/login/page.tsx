"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Film, LogIn } from "lucide-react";
import clsx from "clsx";
import styles from "./login.module.css";

export default function LoginPage() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(false);
        setLoading(true);

        const res = await signIn("credentials", {
            identifier,
            password,
            redirect: false,
        });

        setLoading(false);

        if (res?.error) {
            setError(true);
        } else {
            window.location.href = "/";
        }
    };

    return (
        <div className={styles.screen}>
            <div className={styles.brand}>
                <Film size={36} className={styles.brandIcon} />
                <h1 className={styles.brandName}>CinePillos</h1>
            </div>

            <div className={clsx("glass-card", styles.card)}>
                <h2 className={styles.title}>Entrar</h2>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div>
                        <label className="field-label" htmlFor="identifier">
                            Email o nombre
                        </label>
                        <input
                            id="identifier"
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            autoFocus
                            autoComplete="username"
                            className={clsx("input", error && "input-invalid")}
                        />
                    </div>

                    <div>
                        <label className="field-label" htmlFor="password">
                            PIN
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                            className={clsx("input input-pin", error && "input-invalid")}
                        />
                    </div>

                    {error && (
                        <p className={styles.error}>
                            Email/nombre o PIN incorrectos
                        </p>
                    )}

                    <button
                        type="submit"
                        className={clsx("btn btn-primary", styles.submit)}
                        disabled={loading || !identifier || !password}
                    >
                        <LogIn size={18} />
                        {loading ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}
