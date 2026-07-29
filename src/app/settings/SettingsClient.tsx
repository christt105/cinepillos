"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Check, Upload, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
    name_taken: "Ese nombre ya está en uso",
    current_password_required: "Introduce tu PIN actual para cambiarlo",
    current_password_invalid: "El PIN actual no es correcto",
};

export default function SettingsClient({ user }: { user: User }) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(user.name || "");
    const [imageUrl, setImageUrl] = useState(user.image || "");
    const [imageMode, setImageMode] = useState<"url" | "upload">("url");
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [currentPin, setCurrentPin] = useState("");
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    const currentImage = previewFile || imageUrl || null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setPreviewFile(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setError("");
        if (newPin && newPin !== confirmPin) {
            setError("Los PINs no coinciden");
            return;
        }
        if (newPin && !currentPin) {
            setError("Introduce tu PIN actual para cambiarlo");
            return;
        }

        setSaving(true);
        try {
            let finalImage = imageUrl;

            if (imageMode === "upload" && selectedFile) {
                const formData = new FormData();
                formData.append("file", selectedFile);
                const res = await fetch(`/api/users/${user.id}/avatar`, {
                    method: "POST",
                    body: formData,
                });
                if (res.ok) {
                    const data = await res.json();
                    finalImage = data.image;
                } else {
                    setError("Error subiendo la imagen");
                    setSaving(false);
                    return;
                }
            }

            const body: Record<string, string> = { name };
            if (finalImage) body.image = finalImage;
            if (newPin) {
                body.currentPassword = currentPin;
                body.newPassword = newPin;
            }

            const res = await fetch(`/api/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setCurrentPin("");
                setNewPin("");
                setConfirmPin("");
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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Avatar preview */}
            <div className="glass-card" style={{ padding: "2rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{
                    width: "80px", height: "80px", borderRadius: "50%",
                    overflow: "hidden", flexShrink: 0, position: "relative", background: "#333"
                }}>
                    {currentImage ? (
                        <Image src={currentImage} alt={name} fill style={{ objectFit: "cover" }} unoptimized />
                    ) : (
                        <div style={{
                            width: "100%", height: "100%", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            background: "hsl(var(--primary))", color: "#fff",
                            fontSize: "2rem", fontWeight: "bold"
                        }}>
                            {(name || "?")[0].toUpperCase()}
                        </div>
                    )}
                </div>
                <div>
                    <h2 style={{ fontSize: "1.3rem" }}>{name || "Sin nombre"}</h2>
                    {user.email && <p style={{ opacity: 0.6, fontSize: "0.9rem" }}>{user.email}</p>}
                </div>
            </div>

            {/* Name */}
            <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Nombre</h3>
                <input
                    className="input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ width: "100%", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "white", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
                />
            </div>

            {/* Image */}
            <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Imagen de perfil</h3>

                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                    <button
                        className={imageMode === "url" ? "btn btn-primary" : "btn btn-ghost"}
                        onClick={() => setImageMode("url")}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                    >
                        <LinkIcon size={16} /> URL
                    </button>
                    <button
                        className={imageMode === "upload" ? "btn btn-primary" : "btn btn-ghost"}
                        onClick={() => setImageMode("upload")}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                    >
                        <Upload size={16} /> Subir foto
                    </button>
                </div>

                {imageMode === "url" && (
                    <input
                        type="text"
                        placeholder="https://..."
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        style={{ width: "100%", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "white", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                    />
                )}

                {imageMode === "upload" && (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />
                        <button
                            className="btn btn-ghost"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ width: "100%", border: "1px dashed rgba(255,255,255,0.3)", padding: "1rem" }}
                        >
                            {selectedFile ? selectedFile.name : "Elegir imagen..."}
                        </button>
                    </div>
                )}
            </div>

            {/* PIN change */}
            <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Cambiar PIN</h3>
                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.4rem", opacity: 0.7, fontSize: "0.85rem" }}>PIN actual</label>
                    <input
                        type="password"
                        maxLength={8}
                        value={currentPin}
                        onChange={e => setCurrentPin(e.target.value)}
                        autoComplete="current-password"
                        style={{ width: "100%", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "white", fontSize: "1rem", outline: "none", letterSpacing: "0.3rem", boxSizing: "border-box" }}
                    />
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: "block", marginBottom: "0.4rem", opacity: 0.7, fontSize: "0.85rem" }}>Nuevo PIN</label>
                        <input
                            type="password"
                            maxLength={8}
                            value={newPin}
                            onChange={e => setNewPin(e.target.value)}
                            placeholder="Dejar vacío para no cambiar"
                            style={{ width: "100%", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "white", fontSize: "1rem", outline: "none", letterSpacing: "0.3rem", boxSizing: "border-box" }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: "block", marginBottom: "0.4rem", opacity: 0.7, fontSize: "0.85rem" }}>Confirmar PIN</label>
                        <input
                            type="password"
                            maxLength={8}
                            value={confirmPin}
                            onChange={e => setConfirmPin(e.target.value)}
                            style={{ width: "100%", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.07)", border: newPin && confirmPin && newPin !== confirmPin ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "white", fontSize: "1rem", outline: "none", letterSpacing: "0.3rem", boxSizing: "border-box" }}
                        />
                    </div>
                </div>
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: "0.9rem" }}>{error}</p>}

            <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ padding: "0.85rem", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
            >
                {saved ? <><Check size={18} /> Guardado</> : saving ? "Guardando..." : "Guardar cambios"}
            </button>
        </div>
    );
}
