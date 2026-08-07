"use client";

import { signIn } from "next-auth/react";
import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";
import clsx from "clsx";
import styles from "./ProfileSelector.module.css";

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
                className={styles.avatarImage}
                unoptimized
            />
        );
    }
    return (
        <div
            className={styles.avatarFallback}
            style={{ "--fallback-size": `${size * 0.4}px` } as React.CSSProperties}
        >
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
            <div className={clsx("glass-card", styles.panel)}>
                <h3 className={styles.panelTitle}>Actualizar Avatar</h3>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={styles.dropzone}
                >
                    {preview ? (
                        <Image src={preview} alt="Preview" fill className={styles.dropzoneImage} unoptimized />
                    ) : (
                        <div className={styles.dropzoneEmpty}>
                            Elegir foto
                        </div>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={handleFileChange}
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx("btn btn-ghost", styles.pickButton)}
                >
                    Seleccionar imagen
                </button>

                <div className={styles.panelActions}>
                    <button
                        onClick={handleSaveImage}
                        className="btn btn-primary"
                        disabled={saving || !selectedFile}
                    >
                        {saving ? "Guardando..." : <><Check size={16} /> Guardar</>}
                    </button>
                    <button
                        onClick={() => setEditingUser(null)}
                        className="btn btn-ghost"
                        disabled={saving}
                    >
                        <X size={16} /> Cancelar
                    </button>
                </div>
            </div>
        );
    }

    if (selectedUser) {
        return (
            <div className={clsx("glass-card", styles.panel)}>
                <div className={styles.selectedAvatar}>
                    <Avatar user={selectedUser} size={100} />
                </div>
                <h2 className={styles.selectedName}>{selectedUser.name}</h2>

                <form onSubmit={handleLogin} className={styles.pinForm}>
                    <p className={styles.pinLabel}>Introduce PIN</p>
                    <input
                        type="password"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        autoFocus
                        className={clsx("input", styles.pinInput, error && "input-invalid")}
                    />
                    <div className={styles.panelActions}>
                        <button type="submit" className="btn btn-primary">Entrar</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setSelectedUser(null)}>Volver</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className={styles.grid}>
            {users.map((user) => (
                <div
                    key={user.id}
                    onClick={() => handleProfileClick(user)}
                    className={styles.profile}
                >
                    <div className={styles.profileImage}>
                        <Avatar user={user} size={150} />

                        <div
                            className={styles.editOverlay}
                            onClick={(e) => handleEditClick(e, user)}
                        >
                            <Pencil size={16} />
                        </div>
                    </div>
                    <span className={styles.profileName}>{user.name}</span>
                </div>
            ))}
        </div>
    );
}
