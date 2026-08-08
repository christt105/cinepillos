"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Check, Upload, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import styles from "./settings.module.css";

interface User {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
    name_taken: "Ese nombre ya está en uso",
};

export default function SettingsClient({ user }: { user: User }) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(user.name || "");
    const [imageUrl, setImageUrl] = useState(user.image || "");
    const [imageMode, setImageMode] = useState<"url" | "upload">("url");
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

            const res = await fetch(`/api/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
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
            {/* Avatar preview */}
            <div className={clsx("glass-card", styles.identity)}>
                <div className={clsx("avatar", styles.identityAvatar)}>
                    {currentImage ? (
                        <Image src={currentImage} alt={name} fill className={styles.identityImage} unoptimized />
                    ) : (
                        <div className={styles.identityFallback}>
                            {(name || "?")[0].toUpperCase()}
                        </div>
                    )}
                </div>
                <div>
                    <h2 className={styles.identityName}>{name || "Sin nombre"}</h2>
                    {user.email && <p className={styles.identityEmail}>{user.email}</p>}
                </div>
            </div>

            {/* Name */}
            <div className={clsx("glass-card", styles.card)}>
                <h3 className={styles.cardTitle}>Nombre</h3>
                <input
                    className="input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </div>

            {/* Image */}
            <div className={clsx("glass-card", styles.card)}>
                <h3 className={styles.cardTitle}>Imagen de perfil</h3>

                <div className={styles.modeSwitch}>
                    <button
                        className={clsx("btn", styles.modeButton, imageMode === "url" ? "btn-primary" : "btn-ghost")}
                        onClick={() => setImageMode("url")}
                    >
                        <LinkIcon size={16} /> URL
                    </button>
                    <button
                        className={clsx("btn", styles.modeButton, imageMode === "upload" ? "btn-primary" : "btn-ghost")}
                        onClick={() => setImageMode("upload")}
                    >
                        <Upload size={16} /> Subir foto
                    </button>
                </div>

                {imageMode === "url" && (
                    <input
                        type="text"
                        className="input"
                        placeholder="https://..."
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                    />
                )}

                {imageMode === "upload" && (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className={styles.hiddenInput}
                            onChange={handleFileChange}
                        />
                        <button
                            className={clsx("btn btn-ghost", styles.uploadButton)}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {selectedFile ? selectedFile.name : "Elegir imagen..."}
                        </button>
                    </div>
                )}
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
