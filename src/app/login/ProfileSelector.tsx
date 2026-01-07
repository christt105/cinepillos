"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";

interface User {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

export function ProfileSelector({ users }: { users: User[] }) {
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    // Editing State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [newImageUrl, setNewImageUrl] = useState("");
    const [saving, setSaving] = useState(false);

    const handleProfileClick = (user: User) => {
        if (editingUser) return; // Prevent selection while editing
        setSelectedUser(user);
        setPin("");
        setError(false);
    };

    const handleEditClick = (e: React.MouseEvent, user: User) => {
        e.stopPropagation();
        setEditingUser(user);
        setNewImageUrl(user.image || "");
    };

    const handleSaveImage = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/users/${editingUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: newImageUrl })
            });

            if (res.ok) {
                setEditingUser(null);
                router.refresh(); // Refresh to show new image
            } else {
                alert("Failed to update image");
            }
        } catch (e) {
            console.error(e);
            alert("Error updating image");
        } finally {
            setSaving(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            const res = await signIn("credentials", {
                email: selectedUser.email,
                password: pin, // Assuming PIN is mapped to password field for now
                redirect: true,
                callbackUrl: "/",
            });

            if (res?.error) {
                setError(true);
            }
        } catch (err) {
            console.error(err);
            setError(true);
        }
    };

    // Modal for Editing Image
    if (editingUser) {
        return (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: '0.5rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                <h3 style={{ marginBottom: '1rem' }}>Actualizar Avatar</h3>
                <div style={{ marginBottom: '1.5rem', position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.5rem' }}>
                    <Image
                        src={newImageUrl || "https://via.placeholder.com/150"}
                        alt="Preview"
                        fill
                        style={{ objectFit: 'cover', borderRadius: '4px' }}
                        unoptimized
                    />
                </div>

                <input
                    type="text"
                    placeholder="Pegar URL de imagen"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        background: '#333',
                        border: '1px solid #555',
                        color: 'white',
                        borderRadius: '4px'
                    }}
                />

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        onClick={handleSaveImage}
                        className="btn btn-primary"
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {saving ? "Guardando..." : <><Check size={16} /> Guardar</>}
                    </button>
                    <button
                        onClick={() => setEditingUser(null)}
                        className="btn btn-ghost"
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <X size={16} /> Cancelar
                    </button>
                </div>
            </div>
        );
    }

    if (selectedUser) {
        return (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: '0.5rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <Image
                        src={selectedUser.image || "https://via.placeholder.com/150"}
                        alt={selectedUser.name || "User"}
                        width={100}
                        height={100}
                        style={{ borderRadius: '4px' }}
                        unoptimized
                    />
                    <h2 style={{ marginTop: '1rem' }}>{selectedUser.name}</h2>
                </div>

                <form onSubmit={handleLogin}>
                    <p style={{ marginBottom: '0.5rem', opacity: 0.8 }}>Introduce PIN</p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <input
                            type="password"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            autoFocus
                            style={{
                                background: '#333',
                                border: error ? '1px solid red' : '1px solid #555',
                                padding: '0.75rem',
                                color: 'white',
                                fontSize: '1.5rem',
                                textAlign: 'center',
                                width: '150px',
                                letterSpacing: '0.5rem'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 2rem' }}>Entrar</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setSelectedUser(null)}>Volver</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '2vw', maxWidth: '1000px', width: '100%', justifyContent: 'center' }}>
            {users.map((user) => (
                <div
                    key={user.id}
                    onClick={() => handleProfileClick(user)}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                    className="profile-item"
                >
                    <div className="profile-image-container" style={{
                        width: '10vw',
                        height: '10vw',
                        minWidth: '100px',
                        minHeight: '100px',
                        maxWidth: '200px',
                        maxHeight: '200px',
                        position: 'relative',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '2px solid transparent', // Hover effect border
                        transition: 'border-color 0.2s'
                    }}>
                        <Image
                            src={user.image || "https://via.placeholder.com/150"}
                            alt={user.name || "Profile"}
                            fill
                            style={{ objectFit: 'cover' }}
                            unoptimized
                        />

                        {/* Edit Button Overlay */}
                        <div
                            className="edit-overlay"
                            onClick={(e) => handleEditClick(e, user)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                background: 'rgba(0,0,0,0.6)',
                                padding: '0.5rem',
                                borderBottomLeftRadius: '4px',
                                zIndex: 20,
                                cursor: 'pointer'
                            }}
                        >
                            <Pencil size={16} color="white" />
                        </div>
                    </div>
                    <span style={{ color: '#808080', fontSize: '1.2rem', marginTop: '0.5rem', transition: 'color 0.2s' }}>{user.name}</span>
                    <style jsx>{`
            .profile-item:hover .profile-image-container {
              border-color: white;
            }
            .profile-item:hover span {
              color: white;
            }
            .edit-overlay {
                opacity: 0;
                transition: opacity 0.2s;
            }
            .profile-item:hover .edit-overlay {
                opacity: 1;
            }
            .edit-overlay:hover {
                background: rgba(0,0,0,0.9) !important;
            }
          `}</style>
                </div>
            ))}
        </div>
    );
}
