"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import clsx from "clsx";
import { TMDBMovie } from "@/lib/tmdb";
import styles from "./avatar-picker.module.css";

type AvatarOptions = {
    posters: string[];
    cast: { id: number; name: string; profilePath: string }[];
};

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
    const [movies, setMovies] = useState<TMDBMovie[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null);
    const [options, setOptions] = useState<AvatarOptions | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query) {
                setMovies([]);
                return;
            }
            const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setMovies(data.results ?? []);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [query]);

    const handlePickMovie = async (movie: TMDBMovie) => {
        setSelectedMovie(movie);
        setOptions(null);
        const res = await fetch(`/api/tmdb/movies/${movie.id}/avatar-options`);
        if (res.ok) {
            setOptions(await res.json());
        }
    };

    const handleSelectPoster = async (path: string) => {
        if (!selectedMovie || saving) return;
        setSaving(true);
        const res = await fetch(`/api/users/${userId}/avatar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "poster", tmdbId: selectedMovie.id, path }),
        });
        if (res.ok) onSelected(path);
        setSaving(false);
    };

    const handleSelectCast = async (personId: number, profilePath: string) => {
        if (!selectedMovie || saving) return;
        setSaving(true);
        const res = await fetch(`/api/users/${userId}/avatar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "cast", tmdbId: selectedMovie.id, personId }),
        });
        if (res.ok) onSelected(profilePath);
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

                {!selectedMovie ? (
                    <>
                        <input
                            className="input"
                            placeholder="Busca una película o serie..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                        />
                        <div className={styles.movieGrid}>
                            {movies.map(movie => (
                                <button
                                    key={movie.id}
                                    className={styles.movieOption}
                                    onClick={() => handlePickMovie(movie)}
                                >
                                    <div className="poster">
                                        {movie.poster_path ? (
                                            <Image
                                                src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                                                alt={movie.title}
                                                fill
                                                className="poster-image"
                                            />
                                        ) : (
                                            <div className="poster-placeholder">Sin poster</div>
                                        )}
                                    </div>
                                    <span className={styles.movieOptionTitle}>{movie.title}</span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <button className="btn btn-ghost" onClick={() => setSelectedMovie(null)}>
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
                                        <h4 className={styles.sectionTitle}>Reparto</h4>
                                        <div className={styles.imageGrid}>
                                            {options.cast.map(member => (
                                                <button
                                                    key={member.id}
                                                    className={clsx("avatar", styles.imageOption)}
                                                    title={member.name}
                                                    onClick={() => handleSelectCast(member.id, member.profilePath)}
                                                    disabled={saving}
                                                >
                                                    <Image
                                                        src={`https://image.tmdb.org/t/p/w200${member.profilePath}`}
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
