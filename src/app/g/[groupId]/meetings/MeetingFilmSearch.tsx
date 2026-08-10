"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import { TMDBMovie } from "@/lib/tmdb";
import styles from "./meetings.module.css";

interface MeetingFilmSearchProps {
    groupId: string;
    /// Proposes the film and promotes it to candidate of the meeting in one go.
    onPropose: (movie: TMDBMovie) => void;
    proposingId: number | null;
}

/** TMDB search embedded in a meeting, so a film can be proposed without leaving it. */
export default function MeetingFilmSearch({ groupId, onPropose, proposingId }: MeetingFilmSearchProps) {
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
                    placeholder="Buscar una película..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className={`input ${styles.searchInput}`}
                />
            </div>

            {loading && <p className={styles.pickerEmpty}>Cargando...</p>}

            <div className={styles.searchResults}>
                {movies.map(movie => (
                    <MovieCard
                        key={movie.id}
                        movie={movie}
                        groupId={groupId}
                        onAdd={onPropose}
                        loading={proposingId === movie.id}
                    />
                ))}
            </div>

            {!loading && movies.length === 0 && (
                <p className={styles.pickerEmpty}>No se encontraron películas.</p>
            )}
        </div>
    );
}
