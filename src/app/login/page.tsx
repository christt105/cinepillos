"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Film, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
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
            router.push("/");
        }
    };

    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minHeight: "100vh", background: "#141414", padding: "2rem"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "3rem" }}>
                <Film size={36} color="hsl(260 80% 65%)" />
                <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "#fff" }}>Zorropillos</h1>
            </div>

            <div className="glass-card" style={{ padding: "2.5rem", borderRadius: "1rem", width: "100%", maxWidth: "380px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", textAlign: "center" }}>Entrar</h2>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "0.4rem", opacity: 0.7, fontSize: "0.9rem" }}>
                            Email o nombre
                        </label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            autoFocus
                            autoComplete="username"
                            style={{
                                width: "100%", padding: "0.75rem 1rem",
                                background: "rgba(255,255,255,0.07)", border: error ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "0.5rem", color: "white", fontSize: "1rem", outline: "none",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "0.4rem", opacity: 0.7, fontSize: "0.9rem" }}>
                            PIN
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                            style={{
                                width: "100%", padding: "0.75rem 1rem",
                                background: "rgba(255,255,255,0.07)", border: error ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "0.5rem", color: "white", fontSize: "1rem", outline: "none",
                                letterSpacing: "0.3rem", boxSizing: "border-box"
                            }}
                        />
                    </div>

                    {error && (
                        <p style={{ color: "#ef4444", fontSize: "0.85rem", textAlign: "center" }}>
                            Email/nombre o PIN incorrectos
                        </p>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !identifier || !password}
                        style={{ marginTop: "0.5rem", padding: "0.75rem", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                    >
                        <LogIn size={18} />
                        {loading ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}
