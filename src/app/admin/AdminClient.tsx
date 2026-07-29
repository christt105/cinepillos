"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminClient({ initialUsers, initialFamilies }: { initialUsers: any[], initialFamilies: any[] }) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [familyName, setFamilyName] = useState("");

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });
        setName("");
        setEmail("");
        setPassword("");
        router.refresh();
    };

    const handleCreateFamily = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/admin/families", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: familyName }),
        });
        setFamilyName("");
        router.refresh();
    };

    const handleAssignFamily = async (userId: string, familyId: string) => {
        await fetch(`/api/admin/users/${userId}/family`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ familyId }),
        });
        router.refresh();
    };

    return (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div className="glass-card" style={{ padding: '2rem', flex: 1, minWidth: '300px' }}>
                <h2>Crear Usuario</h2>
                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <input className="input" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} required />
                    <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <input className="input" type="password" placeholder="PIN/Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button className="btn btn-primary" type="submit">Crear</button>
                </form>

                <h3 style={{ marginTop: '2rem' }}>Usuarios</h3>
                <ul style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {initialUsers.map(u => (
                        <li key={u.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
                            <strong>{u.name}</strong> ({u.email})
                            <div style={{ marginTop: '0.5rem' }}>
                                <select 
                                    className="input" 
                                    onChange={(e) => handleAssignFamily(u.id, e.target.value)}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Añadir a familia...</option>
                                    {initialFamilies.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
                                Familias: {u.families.map((f:any) => f.name).join(", ")}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="glass-card" style={{ padding: '2rem', flex: 1, minWidth: '300px' }}>
                <h2>Crear Familia (Grupo)</h2>
                <form onSubmit={handleCreateFamily} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <input className="input" placeholder="Nombre del grupo" value={familyName} onChange={e => setFamilyName(e.target.value)} required />
                    <button className="btn btn-primary" type="submit">Crear</button>
                </form>

                <h3 style={{ marginTop: '2rem' }}>Familias</h3>
                <ul style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {initialFamilies.map(f => (
                        <li key={f.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
                            <strong>{f.name}</strong> ({f.users.length} miembros)
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
