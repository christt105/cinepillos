"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { TMDBMovie } from "@/lib/tmdb";
import styles from "./meetings.module.css";

interface MeetingFilmSearchProps {
    /// Proposes the film and promotes it to candidate of the meeting in one go.
    onPropose: (movie: TMDBMovie) => void;
    proposingId: number | null;
}

/** TMDB search embedded in a meeting, so a film can be proposed without leaving it. */
export default function MeetingFilmSearch({ onPropose, proposingId }: MeetingFilmSearchProps) {
    const t = useTranslations("search");
    const tCommon = useTranslations("common");
    const [query, setQuery] = useState("");
    const [movies, setMovies] = useState<TMDBMovie[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
                const data = await res.json();
                setMovies(data.results || []);
            } catch (error) {
                console.error("Failed to fetch movies", error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className={styles.searchPicker}>
            <div className={styles.searchField}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder={t("placeholder")}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className={`input ${styles.searchInput}`}
                />
            </div>

            {loading && <p className={styles.pickerEmpty}>{tCommon("loading")}</p>}

            <div className={styles.resultsList}>
                {movies.map(movie => (
                    <button
                        key={movie.id}
                        type="button"
                        className={styles.resultRow}
                        onClick={() => onPropose(movie)}
                        disabled={proposingId === movie.id}
                    >
                        <div className={styles.resultPoster}>
                            {movie.poster_path ? (
                                <Image
                                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                                    alt={movie.title}
                                    fill
                                    sizes="52px"
                                    className={styles.resultPosterImage}
                                />
                            ) : (
                                <div className="poster-placeholder">{tCommon("noPoster")}</div>
                            )}
                        </div>
                        <div className={styles.resultInfo}>
                            <span className={styles.resultTitle}>{movie.title}</span>
                            <span className={styles.resultYear}>
                                {movie.release_date ? new Date(movie.release_date).getFullYear() : tCommon("notAvailable")}
                            </span>
                            <p className={styles.resultOverview}>{movie.overview}</p>
                        </div>
                        {proposingId === movie.id ? (
                            <span className={styles.resultLoading}>...</span>
                        ) : (
                            <Plus size={20} className={styles.resultAdd} />
                        )}
                    </button>
                ))}
            </div>

            {!loading && movies.length === 0 && (
                <p className={styles.pickerEmpty}>{t("noResults")}</p>
            )}
        </div>
    );
}
