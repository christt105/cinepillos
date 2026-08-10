"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import clsx from "clsx";
import { TMDBMultiResult } from "@/lib/tmdb";
import styles from "./avatar-picker.module.css";

type SearchResult = {
    id: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
};

type AvatarOptions = {
    posters: string[];
    cast: { id: number; name: string; imageUrl: string }[];
};

function toSearchResult(item: TMDBMultiResult): SearchResult {
    return {
        id: item.id,
        mediaType: item.media_type as "movie" | "tv",
        title: item.title ?? item.name ?? "",
        posterPath: item.poster_path,
    };
}

export default function AvatarPicker({
    userId,
    onSelected,
    onClose,
}: {
    userId: string;
    onSelected: (image: string) => void;
    onClose: () => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
    const [options, setOptions] = useState<AvatarOptions | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query) {
                setResults([]);
                return;
            }
            const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}&media=multi`);
            if (res.ok) {
                const data = await res.json();
                setResults((data.results ?? []).map(toSearchResult));
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [query]);

    const handlePickResult = async (item: SearchResult) => {
        setSelectedItem(item);
        setOptions(null);
        const res = await fetch(`/api/tmdb/movies/${item.id}/avatar-options?mediaType=${item.mediaType}`);
        if (res.ok) {
            setOptions(await res.json());
        }
    };

    const handleSelectPoster = async (path: string) => {
        if (!selectedItem || saving) return;
        setSaving(true);
        const res = await fetch(`/api/users/${userId}/avatar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "poster", tmdbId: selectedItem.id, mediaType: selectedItem.mediaType, path }),
        });
        if (res.ok) onSelected(path);
        setSaving(false);
    };

    const handleSelectCast = async (characterId: number, imageUrl: string) => {
        if (!selectedItem || saving) return;
        setSaving(true);
        const res = await fetch(`/api/users/${userId}/avatar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                kind: "cast",
                tmdbId: selectedItem.id,
                mediaType: selectedItem.mediaType,
                characterId,
            }),
        });
        if (res.ok) onSelected(imageUrl);
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={clsx("modal glass-card", styles.modal)} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>Elegir avatar</h3>
                    <button className="btn btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {!selectedItem ? (
                    <>
                        <input
                            className="input"
                            placeholder="Busca una película o serie..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                        />
                        <div className={styles.movieGrid}>
                            {results.map(item => (
                                <button
                                    key={`${item.mediaType}-${item.id}`}
                                    className={styles.movieOption}
                                    onClick={() => handlePickResult(item)}
                                >
                                    <div className="poster">
                                        {item.posterPath ? (
                                            <Image
                                                src={`https://image.tmdb.org/t/p/w200${item.posterPath}`}
                                                alt={item.title}
                                                fill
                                                className="poster-image"
                                            />
                                        ) : (
                                            <div className="poster-placeholder">Sin poster</div>
                                        )}
                                    </div>
                                    <span className={styles.movieOptionTitle}>{item.title}</span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <button className="btn btn-ghost" onClick={() => setSelectedItem(null)}>
                            ← Buscar otra
                        </button>

                        {!options ? (
                            <p className={styles.status}>Cargando opciones...</p>
                        ) : (
                            <>
                                {options.posters.length > 0 && (
                                    <section>
                                        <h4 className={styles.sectionTitle}>Pósters</h4>
                                        <div className={styles.imageGrid}>
                                            {options.posters.map(path => (
                                                <button
                                                    key={path}
                                                    className={clsx("avatar", styles.imageOption)}
                                                    onClick={() => handleSelectPoster(path)}
                                                    disabled={saving}
                                                >
                                                    <Image
                                                        src={`https://image.tmdb.org/t/p/w200${path}`}
                                                        alt="Póster"
                                                        fill
                                                        className={styles.imageOptionImage}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {options.cast.length > 0 && (
                                    <section>
                                        <h4 className={styles.sectionTitle}>Personajes</h4>
                                        <div className={styles.imageGrid}>
                                            {options.cast.map(member => (
                                                <button
                                                    key={member.id}
                                                    className={clsx("avatar", styles.imageOption)}
                                                    title={member.name}
                                                    onClick={() => handleSelectCast(member.id, member.imageUrl)}
                                                    disabled={saving}
                                                >
                                                    <Image
                                                        src={member.imageUrl}
                                                        alt={member.name}
                                                        fill
                                                        className={styles.imageOptionImage}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {options.posters.length === 0 && options.cast.length === 0 && (
                                    <p className={styles.status}>No hay imágenes disponibles para esta película.</p>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
