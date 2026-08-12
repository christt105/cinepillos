"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import MovieCard from "@/components/MovieCard";
import { TMDBMovie } from "@/lib/tmdb";
import { useProposalToggle } from "@/lib/useProposalToggle";
import styles from "./movie.module.css";

interface SimilarMoviesProps {
    groupId: string;
    tmdbId: number;
}

/** Lets people keep browsing from a film's page instead of going back to search. */
export default function SimilarMovies({ groupId, tmdbId }: SimilarMoviesProps) {
    const t = useTranslations("movie");
    const tSearch = useTranslations("search");
    const [movies, setMovies] = useState<TMDBMovie[]>([]);
    const { proposalsMap, togglingId, toggle } = useProposalToggle(groupId);

    useEffect(() => {
        const fetchSimilar = async () => {
            try {
                const res = await fetch(`/api/tmdb/movies/${tmdbId}/similar`);
                if (res.ok) {
                    const data = await res.json();
                    setMovies(data.results || []);
                }
            } catch (error) {
                console.error("Failed to fetch similar movies", error);
            }
        };
        fetchSimilar();
    }, [tmdbId]);

    if (movies.length === 0) return null;

    const handleToggle = (movie: TMDBMovie) => toggle(movie, () => alert(tSearch("toggleError")));

    return (
        <div className={styles.similarSection}>
            <h3 className={styles.similarTitle}>{t("similarTitle")}</h3>
            <div className={styles.similarGrid}>
                {movies.map(movie => (
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
        </div>
    );
}
