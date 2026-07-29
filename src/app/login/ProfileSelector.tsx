"use client";

import { signIn } from "next-auth/react";
import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";

interface User {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

function Avatar({ user, size = 150 }: { user: User; size?: number }) {
    if (user.image) {
        return (
            <Image
                src={user.image}
                alt={user.name || "User"}
                width={size}
                height={size}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
                unoptimized
            />
        );
    }
    return (
        <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "hsl(260 80% 45%)", color: "#fff",
            fontSize: `${size * 0.4}px`, fontWeight: "bold"
        }}>
            {(user.name || "?")[0].toUpperCase()}
        </div>
    );
}

export function ProfileSelector({ users }: { users: User[] }) {
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleProfileClick = (user: User) => {
        if (editingUser) return;
        setSelectedUser(user);
        setPin("");
        setError(false);
    };

    const handleEditClick = (e: React.MouseEvent, user: User) => {
        e.stopPropagation();
        setEditingUser(user);
        setPreview(user.image);
        setSelectedFile(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleSaveImage = async () => {
        if (!editingUser || !selectedFile) return;
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);

            const res = await fetch(`/api/users/${editingUser.id}/avatar`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                setEditingUser(null);
                setPreview(null);
                setSelectedFile(null);
                router.refresh();
            } else {
                alert("Error al guardar la imagen");
            }
        } catch (e) {
            console.error(e);
            alert("Error al guardar la imagen");
        } finally {
            setSaving(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        const res = await signIn("credentials", {
            email: selectedUser.email,
            password: pin,
            redirect: false,
        });

        if (res?.error) {
            setError(true);
        } else {
            router.push("/");
        }
    };

    if (editingUser) {
        return (
            <div className="glass-card" style={{ padding: "2rem", borderRadius: "0.5rem", textAlign: "center", maxWidth: "400px", width: "100%" }}>
                <h3 style={{ marginBottom: "1rem" }}>Actualizar Avatar</h3>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        width: "100px", height: "100px", margin: "0 auto 1.5rem",
                        borderRadius: "50%", overflow: "hidden", cursor: "pointer",
                        border: "2px dashed rgba(255,255,255,0.3)", position: "relative"
                    }}
                >
                    {preview ? (
                        <Image src={preview} alt="Preview" fill style={{ objectFit: "cover" }} unoptimized />
                    ) : (
                        <div style={{
                            width: "100%", height: "100%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: 0.5, fontSize: "0.8rem"
                        }}>
                            Elegir foto
                        </div>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-ghost"
                    style={{ marginBottom: "1rem", width: "100%" }}
                >
                    Seleccionar imagen
                </button>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                    <button
                        onClick={handleSaveImage}
                        className="btn btn-primary"
                        disabled={saving || !selectedFile}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                    >
                        {saving ? "Guardando..." : <><Check size={16} /> Guardar</>}
                    </button>
                    <button
                        onClick={() => setEditingUser(null)}
                        className="btn btn-ghost"
                        disabled={saving}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                    >
                        <X size={16} /> Cancelar
                    </button>
                </div>
            </div>
        );
    }

    if (selectedUser) {
        return (
            <div className="glass-card" style={{ padding: "2rem", borderRadius: "0.5rem", textAlign: "center", maxWidth: "400px", width: "100%" }}>
                <div style={{ marginBottom: "1.5rem", width: "100px", height: "100px", margin: "0 auto 1.5rem", borderRadius: "4px", overflow: "hidden" }}>
                    <Avatar user={selectedUser} size={100} />
                </div>
                <h2 style={{ marginTop: "1rem", marginBottom: "0" }}>{selectedUser.name}</h2>

                <form onSubmit={handleLogin} style={{ marginTop: "1.5rem" }}>
                    <p style={{ marginBottom: "0.5rem", opacity: 0.8 }}>Introduce PIN</p>
                    <input
                        type="password"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        autoFocus
                        style={{
                            background: "#333",
                            border: error ? "1px solid red" : "1px solid #555",
                            padding: "0.75rem",
                            color: "white",
                            fontSize: "1.5rem",
                            textAlign: "center",
                            width: "150px",
                            letterSpacing: "0.5rem",
                            display: "block",
                            margin: "0 auto 1.5rem"
                        }}
                    />
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 2rem" }}>Entrar</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setSelectedUser(null)}>Volver</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "2vw", maxWidth: "1000px", width: "100%", justifyContent: "center" }}>
            {users.map((user) => (
                <div
                    key={user.id}
                    onClick={() => handleProfileClick(user)}
                    style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}
                    className="profile-item"
                >
                    <div className="profile-image-container" style={{
                        width: "10vw", height: "10vw",
                        minWidth: "100px", minHeight: "100px",
                        maxWidth: "200px", maxHeight: "200px",
                        position: "relative", borderRadius: "4px",
                        overflow: "hidden", border: "2px solid transparent",
                        transition: "border-color 0.2s"
                    }}>
                        <Avatar user={user} size={150} />

                        <div
                            className="edit-overlay"
                            onClick={(e) => handleEditClick(e, user)}
                            style={{
                                position: "absolute", top: 0, right: 0,
                                background: "rgba(0,0,0,0.6)", padding: "0.5rem",
                                borderBottomLeftRadius: "4px", zIndex: 20, cursor: "pointer"
                            }}
                        >
                            <Pencil size={16} color="white" />
                        </div>
                    </div>
                    <span style={{ color: "#808080", fontSize: "1.2rem", marginTop: "0.5rem", transition: "color 0.2s" }}>{user.name}</span>
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
