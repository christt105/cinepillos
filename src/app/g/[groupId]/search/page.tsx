"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import clsx from "clsx";
import MovieCard from "@/components/MovieCard";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { TMDBGenre, TMDBMovie } from "@/lib/tmdb";
import { useProposalToggle } from "@/lib/useProposalToggle";
import styles from "./search.module.css";

export default function SearchPage() {
    const t = useTranslations("search");
    const tCommon = useTranslations("common");
    const { groupId } = useParams<{ groupId: string }>();
    const [query, setQuery] = useState("");
    const [genres, setGenres] = useState<TMDBGenre[]>([]);
    const [activeGenre, setActiveGenre] = useState<number | null>(null);
    const [movies, setMovies] = useState<TMDBMovie[]>([]);
    const [loading, setLoading] = useState(false);

    const { proposalsMap, togglingId, toggle } = useProposalToggle(groupId);

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const res = await fetch("/api/tmdb/genres");
                if (res.ok) setGenres(await res.json());
            } catch (error) {
                console.error("Failed to fetch genres", error);
            }
        };
        fetchGenres();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMovies(query, activeGenre);
        }, 500);

        return () => clearTimeout(timer);
    }, [query, activeGenre]);

    async function fetchMovies(searchQuery: string, genreId: number | null) {
        setLoading(true);
        try {
            const url = searchQuery.trim() === "" && genreId !== null
                ? `/api/tmdb/discover?genre=${genreId}`
                : `/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`;
            const res = await fetch(url);
            const data = await res.json();
            setMovies(data.results || []);
        } catch (error) {
            console.error("Failed to fetch movies", error);
        } finally {
            setLoading(false);
        }
    }

    const handleToggle = (movie: TMDBMovie) => toggle(movie, () => alert(t("toggleError")));

    const selectGenre = (genreId: number) => {
        setQuery("");
        setActiveGenre(current => (current === genreId ? null : genreId));
    };

    return (
        <div className="page">
            <div className={styles.searchBar}>
                <div className={styles.searchField}>
                    <Search className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder={t("placeholder")}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveGenre(null);
                        }}
                        className={`input ${styles.searchInput}`}
                    />
                </div>
            </div>

            {genres.length > 0 && (
                <div className={styles.genres}>
                    {genres.map(genre => (
                        <button
                            key={genre.id}
                            type="button"
                            className={clsx("btn", styles.genreChip, activeGenre === genre.id ? "btn-primary" : "btn-ghost")}
                            onClick={() => selectGenre(genre.id)}
                        >
                            {genre.name}
                        </button>
                    ))}
                </div>
            )}

            {loading && <p className={styles.status}>{tCommon("loading")}</p>}

            <div className={styles.results}>
                {movies.map((movie) => (
                    <MovieCard
                        key={movie.id}
                        movie={movie}
                        groupId={groupId}
                        onAdd={handleToggle}
                        loading={togglingId === movie.id}
                        isProposed={proposalsMap.has(movie.id)}
                    />
                ))}
            </div>

            {!loading && movies.length === 0 && (
                <p className={styles.emptyStatus}>{t("noResults")}</p>
            )}
        </div>
    );
}
