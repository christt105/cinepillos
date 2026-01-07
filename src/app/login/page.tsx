"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import styles from "./page.module.css"; // We'll create this or use inline for now. Let's use inline for simplicity or reuse global styles.

// Reusing global styles for simplicity in this quick fix
export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await signIn("credentials", {
            email,
            password,
            callbackUrl: "/",
        });
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="glass-card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', borderRadius: '1rem' }}>
                <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Sign In</h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="glass" // Reusing glass class for input background? Might need specific input styles.
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
